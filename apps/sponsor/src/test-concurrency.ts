/**
 * Concurrency proof for the WIRED create-account handler (C1 fix, testnet).
 *
 * spike8 proved the channel MECHANISM in isolation. This proves the REAL code path:
 * lib/create-account.createAccountHandler + lib/channels.ChannelManager, exactly as the
 * Worker calls it. Fires N concurrent onboardings and submits each as the client would.
 *
 *   FIX     — handler WITH a channel pool → N/N succeed, 0 tx_bad_seq, every sandwich
 *             is channel-sourced (via: "channel").
 *   CONTROL — the SAME handler with channels disabled → the sponsor's single sequence
 *             serializes everyone → ≤1 succeeds (the bug the fix removes).
 *
 * In-process + an in-memory lease store (single process ⇒ the store is correct here; the
 * cross-isolate Redis store is exercised live against the deployed Worker after deploy).
 *
 * RUN:  pnpm --filter @lumenia/sponsor test:concurrency
 * NEEDS: internet (Horizon testnet + friendbot). Testnet only, no real money.
 */
import {
  Keypair,
  Horizon,
  TransactionBuilder,
  Operation,
  Networks,
  BASE_FEE,
  type Transaction,
} from "@stellar/stellar-sdk";
import { makeConfig } from "./lib/config.js";
import { signerFromSecret } from "./lib/signer.js";
import { ChannelManager, memoryLeaseStore } from "./lib/channels.js";
import { createAccountHandler } from "./lib/create-account.js";

const NETWORK = Networks.TESTNET;
const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const CONCURRENCY = 20;
const POOL_SIZE = 20;

async function friendbot(pub: string): Promise<void> {
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(pub)}`);
  if (!res.ok) throw new Error(`friendbot fail ${pub}: ${res.status}`);
}

type Outcome = { ok: true } | { ok: false; reason: "bad_seq" | "timeout" | "other"; code: string };

/** Submit the client-signed sandwich (recipient co-signs), classifying the failure. */
async function submitAsClient(xdr: string, recipient: Keypair): Promise<Outcome> {
  try {
    const tx = TransactionBuilder.fromXDR(xdr, NETWORK) as Transaction;
    tx.sign(recipient);
    await server.submitTransaction(tx);
    return { ok: true };
  } catch (e: unknown) {
    const err = e as {
      response?: { status?: number; data?: { extras?: { result_codes?: { transaction?: string } } } };
      message?: string;
    };
    const txCode = err?.response?.data?.extras?.result_codes?.transaction ?? "";
    const status = err?.response?.status;
    let reason: "bad_seq" | "timeout" | "other" = "other";
    if (txCode === "tx_bad_seq") reason = "bad_seq";
    else if (status === 504 || status === 502 || status === 408 || /timeout/i.test(err?.message ?? "")) reason = "timeout";
    return { ok: false, reason, code: txCode || err?.message || "unknown" };
  }
}

async function recipientOk(pub: string, code: string, issuer: string): Promise<boolean> {
  try {
    const acc = await server.loadAccount(pub);
    const xlm = acc.balances.find((b) => b.asset_type === "native")?.balance ?? "0";
    const line = acc.balances.find(
      (b) => "asset_code" in b && b.asset_code === code && "asset_issuer" in b && b.asset_issuer === issuer,
    );
    return xlm === "0.0000000" && !!line;
  } catch {
    return false;
  }
}

async function mapPooled<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

async function main() {
  console.log("============================================================");
  console.log(" CONCURRENCY PROOF — wired create-account handler (C1)");
  console.log("============================================================");

  const sponsor = Keypair.random();
  const issuer = Keypair.random();
  console.log(`\n[1] friendbot sponsor + issuer`);
  await Promise.all([friendbot(sponsor.publicKey()), friendbot(issuer.publicKey())]);

  console.log(`[2] provision ${POOL_SIZE} channel accounts (one sponsor tx, 2 XLM each)`);
  const channelKps = Array.from({ length: POOL_SIZE }, () => Keypair.random());
  {
    const acc = await server.loadAccount(sponsor.publicKey());
    const b = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK });
    for (const ch of channelKps) b.addOperation(Operation.createAccount({ destination: ch.publicKey(), startingBalance: "2" }));
    const tx = b.setTimeout(180).build();
    tx.sign(sponsor);
    await server.submitTransaction(tx);
    console.log(`   ✔ ${POOL_SIZE} channels funded`);
  }

  const config = makeConfig({
    network: "testnet",
    sponsorSecret: sponsor.secret(),
    usdcIssuer: issuer.publicKey(),
    channelSecrets: channelKps.map((k) => k.secret()),
  });
  const signer = signerFromSecret(config.sponsorSecret);
  const channels = new ChannelManager(config.channelSecrets, memoryLeaseStore());

  /* ---------------- FIX: handler WITH the channel pool ---------------- */
  console.log(`\n[FIX] ${CONCURRENCY} concurrent onboardings through the channel pool`);
  const recipsFix = Array.from({ length: CONCURRENCY }, () => Keypair.random());
  const fix = await Promise.all(
    recipsFix.map(async (r) => {
      const res = await createAccountHandler(server, config, signer, { recipientPublicKey: r.publicKey() }, channels);
      const out = await submitAsClient(res.xdr, r);
      return { via: res.via, out };
    }),
  );
  const fixOk = fix.filter((f) => f.out.ok).length;
  const fixBadSeq = fix.filter((f) => !f.out.ok && (f.out as { reason: string }).reason === "bad_seq").length;
  const fixViaChannel = fix.filter((f) => f.via === "channel").length;
  const fixFirstFail = fix.find((f) => !f.out.ok);
  console.log(`   succeeded:      ${fixOk}/${CONCURRENCY}`);
  console.log(`   tx_bad_seq:     ${fixBadSeq}  (expect 0)`);
  console.log(`   channel-sourced: ${fixViaChannel}/${CONCURRENCY}  (expect all)`);
  if (fixFirstFail && !fixFirstFail.out.ok) console.log(`   first fail: ${(fixFirstFail.out as { code: string }).code}`);
  const verified = (await mapPooled(recipsFix, 8, (r) => recipientOk(r.publicKey(), "USDC", issuer.publicKey()))).filter(Boolean).length;
  console.log(`   verified on-ledger (0 XLM + USDC trustline): ${verified}/${CONCURRENCY}`);
  const fixPass = fixOk === CONCURRENCY && fixBadSeq === 0 && fixViaChannel === CONCURRENCY && verified === CONCURRENCY;

  /* --------------- CONTROL: same handler, channels OFF --------------- */
  console.log(`\n[CONTROL] ${CONCURRENCY} concurrent with channels DISABLED (sponsor-sourced)`);
  const recipsCtl = Array.from({ length: CONCURRENCY }, () => Keypair.random());
  const ctl = await Promise.all(
    recipsCtl.map(async (r) => {
      // channels = undefined ⇒ the handler uses the sponsor-sourced fallback (today's bug)
      const res = await createAccountHandler(server, config, signer, { recipientPublicKey: r.publicKey() }, undefined);
      const out = await submitAsClient(res.xdr, r);
      return { via: res.via, out };
    }),
  );
  const ctlOk = ctl.filter((c) => c.out.ok).length;
  const ctlCollision = ctl.filter((c) => !c.out.ok && ((c.out as { reason: string }).reason === "bad_seq" || (c.out as { reason: string }).reason === "timeout")).length;
  console.log(`   succeeded:      ${ctlOk}/${CONCURRENCY}  (single sequence → at most one)`);
  console.log(`   seq-collision:  ${ctlCollision}  ← the bug the pool removes`);
  const ctlProvesBug = ctlOk <= 1 && ctlOk < CONCURRENCY;

  const pass = fixPass && ctlProvesBug;
  console.log("\n============================================================");
  console.log(pass ? " ✅ CONCURRENCY PROOF PASS" : " ❌ CONCURRENCY PROOF FAIL");
  console.log("============================================================");
  console.log(` FIX     wired pool: ${fixOk}/${CONCURRENCY}, 0 bad_seq, all channel-sourced : ${fixPass}`);
  console.log(` CONTROL channels off reproduces the bug (≤1 wins)            : ${ctlProvesBug}  [${ctlOk} ok]`);
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error("\n💥 concurrency proof crashed:", e);
  process.exit(1);
});
