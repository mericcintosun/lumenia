/**
 * ============================================================================
 *  SPIKE #8 — Channel-account concurrency  (C1 mainnet blocker)
 * ============================================================================
 *
 *  THE BUG (C1): /create-account builds its sandwich with tx.source = sponsor,
 *  so the sponsor's SINGLE sequence number serializes every onboarding. When a
 *  link goes viral and N recipients claim at once, each request independently
 *  reads the sponsor's sequence S, builds tx with seq S+1, and only ONE applies
 *  — the rest bounce with tx_bad_seq. The exact "viral load" pattern breaks.
 *
 *  THE FIX (Stellar "channel accounts" pattern): a POOL of funded channel
 *  accounts each LEND a tx SOURCE + sequence number. The sponsor stays the
 *  SIGNER of its own ops (begin/createAccount) AND the fee source — it wraps the
 *  channel-sourced inner tx in a FEE-BUMP. Different concurrent requests grab
 *  different channels → independent sequences → no collision. The sponsor never
 *  gives up any authority: it still signs the sponsoring ops and still pays the
 *  fee; the channel only lends a sequence number.
 *
 *    inner tx:  source = channel[i]                       (sequence source)
 *               beginSponsoringFutureReserves(recipient, source=sponsor)
 *               createAccount(recipient, 0 XLM,   source=sponsor)
 *               changeTrust(USDC,                 source=recipient)
 *               endSponsoringFutureReserves(      source=recipient)
 *               sigs: channel[i] + sponsor + recipient
 *    fee-bump:  feeSource = sponsor                       (sponsor pays the fee)
 *               sig: sponsor
 *
 *  THREE TESTS — standalone, ZERO risk to the live path (fresh testnet actors):
 *    A CONTROL — 20 concurrent sponsor-sourced sandwiches (TODAY's design) MUST
 *                reproduce tx_bad_seq. Proves the bug is real (else the spike is
 *                measuring nothing).
 *    B FIX     — 20 concurrent, one channel each → 20/20 succeed, 0 tx_bad_seq.
 *    C REUSE   — 20 concurrent over a pool of 5 → the checkout queue serializes
 *                per-channel and reuses each channel after its tx confirms →
 *                20/20 succeed, 0 tx_bad_seq (proves the pool logic, not just
 *                "throw 20 channels at 20 requests").
 *
 *  RUN:   pnpm --filter @lumenia/sponsor spike8
 *  NEEDS: internet (Horizon testnet + friendbot). Testnet only, no real money.
 * ============================================================================
 */

import {
  Keypair,
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  BASE_FEE,
  Account,
  type Transaction,
  type FeeBumpTransaction,
} from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const NETWORK = Networks.TESTNET;
const server = new Horizon.Server(HORIZON_URL);

const CONCURRENCY = 20; // "N people claim the viral link at once"
const POOL_SMALL = 5; // test C: fewer channels than requests → forces reuse
/** Fee-bump bid per operation (stroops). inner=4 ops → total = 1000×(4+1)=5000 = 0.0005 XLM. */
const FEE_BUMP_PER_OP = "1000";

/* ------------------------------- helpers -------------------------------- */

function log(step: string, msg: string) {
  console.log(`\n[${step}] ${msg}`);
}

async function friendbot(pub: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(pub)}`);
  if (!res.ok) throw new Error(`friendbot fail ${pub}: ${res.status} ${await res.text()}`);
}

/**
 * A concurrent single-sequence collision presents in TWO ways on Horizon:
 *  - tx_bad_seq        — core rejected the duplicate sequence outright, or
 *  - gateway timeout   — Horizon's synchronous submit holds the duplicate-seq tx
 *                        (never included) until the gateway 504s.
 * Both mean the same thing: the sponsor's ONE sequence served only one tx and
 * the rest did not get onboarded. We classify them together as "seq-collision".
 */
type FailReason = "bad_seq" | "timeout" | "other";
type Outcome =
  | { ok: true; hash: string }
  | { ok: false; reason: FailReason; code: string };

/** Submit without throwing — classify the failure so we can COUNT the collision. */
async function trySubmit(tx: Transaction | FeeBumpTransaction): Promise<Outcome> {
  try {
    const res = await server.submitTransaction(tx);
    return { ok: true, hash: res.hash };
  } catch (e: unknown) {
    const err = e as {
      response?: { status?: number; data?: { extras?: { result_codes?: { transaction?: string; operations?: string[] } } } };
      message?: string;
    };
    const codes = err?.response?.data?.extras?.result_codes;
    const txCode = codes?.transaction ?? "";
    const opCodes = codes?.operations ?? [];
    const status = err?.response?.status;
    let reason: FailReason = "other";
    if (txCode === "tx_bad_seq") reason = "bad_seq";
    else if (status === 504 || status === 502 || status === 408 || /timeout/i.test(err?.message ?? "")) reason = "timeout";
    const code = txCode
      ? `${txCode}${opCodes.length ? ` [${opCodes.join(",")}]` : ""}`
      : (err?.message ?? "unknown");
    return { ok: false, reason, code };
  }
}

const isBadSeq = (o: Outcome): boolean => !o.ok && o.reason === "bad_seq";

async function accountExists(pub: string): Promise<boolean> {
  try {
    await server.loadAccount(pub);
    return true;
  } catch {
    return false;
  }
}

/** Verify a sponsored recipient is REAL: exists, holds 0 XLM, has the USDC trustline. */
async function verifyRecipient(pub: string, usdc: Asset): Promise<boolean> {
  try {
    const acc = await server.loadAccount(pub);
    const xlm = acc.balances.find((b) => b.asset_type === "native")?.balance ?? "0";
    const line = acc.balances.find(
      (b) =>
        "asset_code" in b &&
        b.asset_code === usdc.getCode() &&
        "asset_issuer" in b &&
        b.asset_issuer === usdc.getIssuer(),
    );
    return xlm === "0.0000000" && !!line;
  } catch {
    return false;
  }
}

/** Run tasks with a bounded concurrency (keep friendbot / verify from stampeding). */
async function mapPooled<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/* ----------------------------- channel pool ----------------------------- */

interface Channel {
  kp: Keypair;
  id: number;
  uses: number;
}

/**
 * A checkout pool: acquire() hands out a free channel or waits in FIFO order;
 * the channel is held until release() so a channel NEVER has two in-flight txs
 * (its sequence would collide with itself). Because trySubmit() awaits on-ledger
 * inclusion before we release, the next acquire re-reads a settled sequence.
 * This is the exact seam that would slot behind lib/create-account.ts.
 */
class ChannelPool {
  private free: Channel[];
  private waiters: Array<(c: Channel) => void> = [];
  readonly size: number;

  constructor(channels: Channel[]) {
    this.free = [...channels];
    this.size = channels.length;
  }

  private acquire(): Promise<Channel> {
    const c = this.free.shift();
    if (c) return Promise.resolve(c);
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private release(c: Channel): void {
    const w = this.waiters.shift();
    if (w) w(c);
    else this.free.push(c);
  }

  async withChannel<T>(fn: (c: Channel) => Promise<T>): Promise<T> {
    const c = await this.acquire();
    c.uses++;
    try {
      return await fn(c);
    } finally {
      this.release(c);
    }
  }
}

/* --------------------------- sandwich builders -------------------------- */

/** The FIX: channel-sourced inner + sponsor fee-bump. Reloads the channel's live sequence. */
async function buildChanneled(
  channel: Keypair,
  sponsor: Keypair,
  recipient: Keypair,
  usdc: Asset,
): Promise<FeeBumpTransaction> {
  const channelAcc = await server.loadAccount(channel.publicKey()); // fresh seq — safe: held until confirmed
  const inner = new TransactionBuilder(channelAcc, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(
      Operation.beginSponsoringFutureReserves({ sponsoredId: recipient.publicKey(), source: sponsor.publicKey() }),
    )
    .addOperation(
      Operation.createAccount({ destination: recipient.publicKey(), startingBalance: "0", source: sponsor.publicKey() }),
    )
    .addOperation(Operation.changeTrust({ asset: usdc, source: recipient.publicKey() }))
    .addOperation(Operation.endSponsoringFutureReserves({ source: recipient.publicKey() }))
    .setTimeout(180)
    .build();
  inner.sign(channel); // tx source (sequence)
  inner.sign(sponsor); // begin + createAccount
  inner.sign(recipient); // changeTrust + end (on-device in prod)
  const feeBump = TransactionBuilder.buildFeeBumpTransaction(sponsor.publicKey(), FEE_BUMP_PER_OP, inner, NETWORK);
  feeBump.sign(sponsor); // sponsor pays the fee
  return feeBump;
}

/**
 * TODAY's design (the bug), faithfully: the sponsor is the tx source. Under
 * concurrency every request reads the SAME sponsor sequence, so we snapshot it
 * once and build each request from that snapshot — the deterministic worst case
 * of "everyone read before anyone wrote".
 */
function buildSponsorSourced(
  sponsor: Keypair,
  seqSnapshot: string,
  recipient: Keypair,
  usdc: Asset,
): Transaction {
  const sponsorAcc = new Account(sponsor.publicKey(), seqSnapshot); // same seq for all → collision
  const tx = new TransactionBuilder(sponsorAcc, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(
      Operation.beginSponsoringFutureReserves({ sponsoredId: recipient.publicKey(), source: sponsor.publicKey() }),
    )
    .addOperation(
      Operation.createAccount({ destination: recipient.publicKey(), startingBalance: "0", source: sponsor.publicKey() }),
    )
    .addOperation(Operation.changeTrust({ asset: usdc, source: recipient.publicKey() }))
    .addOperation(Operation.endSponsoringFutureReserves({ source: recipient.publicKey() }))
    .setTimeout(180)
    .build();
  tx.sign(sponsor);
  tx.sign(recipient);
  return tx;
}

/* -------------------------------- main ---------------------------------- */

async function main() {
  console.log("============================================================");
  console.log(" SPIKE #8 — Channel-account concurrency (C1 mainnet blocker)");
  console.log("============================================================");

  const issuer = Keypair.random();
  const sponsor = Keypair.random();
  const USDC = new Asset("USDC", issuer.publicKey());

  log("1", "Fund issuer + sponsor (friendbot)");
  await Promise.all([friendbot(issuer.publicKey()), friendbot(sponsor.publicKey())]);
  console.log(`   sponsor: ${sponsor.publicKey()}`);
  console.log(`   issuer:  ${issuer.publicKey()} (USDC)`);

  log("2", `Sponsor provisions ${CONCURRENCY} channel accounts (one tx, 1.5 XLM each)`);
  const channelKps = Array.from({ length: CONCURRENCY }, () => Keypair.random());
  {
    const sponsorAcc = await server.loadAccount(sponsor.publicKey());
    const b = new TransactionBuilder(sponsorAcc, { fee: BASE_FEE, networkPassphrase: NETWORK });
    for (const ch of channelKps) {
      b.addOperation(Operation.createAccount({ destination: ch.publicKey(), startingBalance: "1.5" }));
    }
    const tx = b.setTimeout(180).build();
    tx.sign(sponsor);
    const r = await trySubmit(tx);
    if (!r.ok) throw new Error(`channel provisioning failed: ${r.code}`);
    console.log(`   ✔ ${CONCURRENCY} channels created in ${r.hash.slice(0, 10)}…`);
  }

  /* ===================== TEST A — CONTROL (the bug) ===================== */
  log("A", `CONTROL: ${CONCURRENCY} concurrent SPONSOR-sourced sandwiches (today's design)`);
  const recipientsA = Array.from({ length: CONCURRENCY }, () => Keypair.random());
  const sponsorSeq = (await server.loadAccount(sponsor.publicKey())).sequenceNumber(); // one snapshot, read by all
  const outA = await Promise.all(
    recipientsA.map((r) => trySubmit(buildSponsorSourced(sponsor, sponsorSeq, r, USDC))),
  );
  const aSucceeded = outA.filter((o) => o.ok).length;
  const aBadSeq = outA.filter((o) => !o.ok && o.reason === "bad_seq").length;
  const aTimeout = outA.filter((o) => !o.ok && o.reason === "timeout").length;
  const aCollision = aBadSeq + aTimeout; // both are the single-sequence collision presenting
  const aOther = outA.filter((o) => !o.ok && o.reason === "other").length;
  console.log(`   succeeded:  ${aSucceeded}/${CONCURRENCY}  (single sequence → at most one can win)`);
  console.log(`   seq-collision: ${aCollision}  (tx_bad_seq ${aBadSeq} + gateway-timeout ${aTimeout})  ← THE BUG`);
  if (aOther) {
    const other = outA.find((o) => !o.ok && o.reason === "other") as Extract<Outcome, { ok: false }> | undefined;
    console.log(`   other fail:   ${aOther} (${other?.code})`);
  }
  // The single sequence can commit AT MOST ONE tx; every other request must fail
  // with a collision presentation (tx_bad_seq or gateway-timeout). That is the bug.
  const aProvesBug = aSucceeded <= 1 && aSucceeded < CONCURRENCY && aCollision === CONCURRENCY - aSucceeded;

  /* ================= TEST B — FIX, one channel per request ============== */
  log("B", `FIX: ${CONCURRENCY} concurrent, ONE channel each (channel source + sponsor fee-bump)`);
  const recipientsB = Array.from({ length: CONCURRENCY }, () => Keypair.random());
  const outB = await Promise.all(
    recipientsB.map(async (r, i) => {
      const feeBump = await buildChanneled(channelKps[i], sponsor, r, USDC);
      return trySubmit(feeBump);
    }),
  );
  const bSucceeded = outB.filter((o) => o.ok).length;
  const bBadSeq = outB.filter(isBadSeq).length;
  const bFirstFail = outB.find((o) => !o.ok) as Extract<Outcome, { ok: false }> | undefined;
  console.log(`   succeeded:  ${bSucceeded}/${CONCURRENCY}`);
  console.log(`   tx_bad_seq: ${bBadSeq}  (expect 0)`);
  if (bFirstFail) console.log(`   first fail: ${bFirstFail.code}`);
  const okBRecipients = (await mapPooled(recipientsB, 8, (r) => verifyRecipient(r.publicKey(), USDC))).filter(Boolean).length;
  console.log(`   verified on-ledger (0 XLM + USDC trustline): ${okBRecipients}/${CONCURRENCY}`);
  const bPass = bSucceeded === CONCURRENCY && bBadSeq === 0 && okBRecipients === CONCURRENCY;

  /* ============ TEST C — REUSE: pool of 5 under 20 concurrent =========== */
  log("C", `REUSE: pool of ${POOL_SMALL} channels under ${CONCURRENCY} concurrent requests`);
  const poolChannels: Channel[] = channelKps.slice(0, POOL_SMALL).map((kp, i) => ({ kp, id: i, uses: 0 }));
  const pool = new ChannelPool(poolChannels);
  const recipientsC = Array.from({ length: CONCURRENCY }, () => Keypair.random());
  const outC = await Promise.all(
    recipientsC.map((r) =>
      pool.withChannel(async (ch) => {
        const feeBump = await buildChanneled(ch.kp, sponsor, r, USDC);
        return trySubmit(feeBump);
      }),
    ),
  );
  const cSucceeded = outC.filter((o) => o.ok).length;
  const cBadSeq = outC.filter(isBadSeq).length;
  const cFirstFail = outC.find((o) => !o.ok) as Extract<Outcome, { ok: false }> | undefined;
  const totalUses = poolChannels.reduce((s, c) => s + c.uses, 0);
  const maxUses = Math.max(...poolChannels.map((c) => c.uses));
  console.log(`   succeeded:  ${cSucceeded}/${CONCURRENCY}`);
  console.log(`   tx_bad_seq: ${cBadSeq}  (expect 0)`);
  if (cFirstFail) console.log(`   first fail: ${cFirstFail.code}`);
  console.log(`   channel reuse: ${totalUses} checkouts over ${POOL_SMALL} channels (max ${maxUses}/channel)`);
  const okCRecipients = (await mapPooled(recipientsC, 8, (r) => verifyRecipient(r.publicKey(), USDC))).filter(Boolean).length;
  console.log(`   verified on-ledger (0 XLM + USDC trustline): ${okCRecipients}/${CONCURRENCY}`);
  const cPass =
    cSucceeded === CONCURRENCY && cBadSeq === 0 && okCRecipients === CONCURRENCY && totalUses === CONCURRENCY && maxUses > 1;

  /* ------------------------------ RESULT ------------------------------ */
  const pass = aProvesBug && bPass && cPass;
  console.log("\n============================================================");
  console.log(pass ? " ✅ SPIKE #8 PASS" : " ❌ SPIKE #8 FAIL");
  console.log("============================================================");
  console.log(` A control reproduces the bug (≤1 wins, rest collide): ${aProvesBug}  [${aSucceeded} ok / ${aCollision} seq-collision]`);
  console.log(` B one-channel-each: ${CONCURRENCY}/${CONCURRENCY}, 0 bad_seq      : ${bPass}`);
  console.log(` C pool-of-${POOL_SMALL} reuse: ${CONCURRENCY}/${CONCURRENCY}, 0 bad_seq     : ${cPass}`);
  console.log("\n Channel accounts eliminate the sponsor's single-sequence bottleneck:");
  console.log(" each concurrent onboarding borrows an independent sequence, while the");
  console.log(" sponsor still signs its ops and still pays the fee (via fee-bump).");

  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error("\n💥 SPIKE #8 crashed:", e);
  process.exit(1);
});
