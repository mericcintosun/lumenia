/**
 * ============================================================================
 *  SPIKE #1 — Sponsored 0-XLM Claim (Stellar testnet)
 * ============================================================================
 *
 *  GOAL (Tyler + Elliot's day-1 gate): prove the ECONOMIC BACKBONE of Lumenia.
 *  If a new user can own an account + USDC trustline with ZERO XLM
 *  and the sponsor pays ALL reserve + fee, and a fee-bumped claim works,
 *  and the anti-drain validator rejects a malicious inner tx → the product's spine is solid.
 *
 *  What is proven:
 *    1. Sponsored onboarding: recipient has 0 XLM, but has an account + USDC trustline (reserve on the sponsor)
 *    2. Sender creates a Claimable Balance (two claimants: recipient + sender-reclaim-after-7d)
 *    3. Recipient CLAIMs it — the sponsor fee-bumps the fee, recipient still has 0 XLM
 *    4. Anti-drain validator: an inner tx containing an unexpected op → REJECT
 *
 *  RUN:    pnpm spike1     (inside apps/sponsor)  —  or  pnpm --filter @lumenia/sponsor spike1
 *  NEEDS:  Node 20+, internet (Horizon testnet + friendbot). NO mainnet/real money.
 *
 *  NOTE: on testnet we issue our own "USDC" test asset (our own issuer).
 *        In prod this would be native Circle USDC. The canonical form of the anti-drain validator
 *        is in packages/shared/src/index.ts — inlined here to keep this self-contained.
 * ============================================================================
 */

import {
  Keypair,
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  Claimant,
  BASE_FEE,
  type Transaction,
} from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const NETWORK = Networks.TESTNET;
const server = new Horizon.Server(HORIZON_URL);

const RECLAIM_AFTER_SECONDS = (7 * 24 * 60 * 60).toString(); // 7 days

/* ----------------------------- helpers ------------------------------ */

function log(step: string, msg: string) {
  console.log(`\n[${step}] ${msg}`);
}

async function friendbot(pub: string, label: string) {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(pub)}`);
  if (!res.ok) throw new Error(`friendbot ${label} fail: ${res.status} ${await res.text()}`);
  console.log(`   ✔ funded ${label}: ${pub}`);
}

/** submit + on error print Horizon's result_codes in a readable form. */
async function submit(tx: Parameters<typeof server.submitTransaction>[0], label: string) {
  try {
    const res = await server.submitTransaction(tx);
    console.log(`   ✔ ${label} → ${res.hash}`);
    return res;
  } catch (e: unknown) {
    const extras = (e as { response?: { data?: { extras?: unknown } } })?.response?.data?.extras;
    console.error(`   ✗ ${label} FAILED`, JSON.stringify(extras ?? e, null, 2));
    throw e;
  }
}

async function nativeBalance(pub: string): Promise<string> {
  const acc = await server.loadAccount(pub);
  const xlm = acc.balances.find((b) => b.asset_type === "native");
  return xlm?.balance ?? "0";
}

async function assetBalance(pub: string, code: string, issuer: string): Promise<string> {
  const acc = await server.loadAccount(pub);
  const line = acc.balances.find(
    (b) =>
      "asset_code" in b && b.asset_code === code && "asset_issuer" in b && b.asset_issuer === issuer,
  );
  return line ? line.balance : "NO_TRUSTLINE";
}

/* ----------------- anti-drain validator (inline copy) ------------------ */
/* Canonical form: packages/shared/src/index.ts → validateInnerTransaction */

const ALLOWED_INNER_OP_TYPES = new Set<string>([
  "beginSponsoringFutureReserves",
  "createAccount",
  "changeTrust",
  "endSponsoringFutureReserves",
  "claimClaimableBalance",
  "payment",
]);

function validateInnerTransaction(
  tx: Transaction,
  policy: { expectedSource: string; sponsor: string; maxOps?: number },
): { ok: boolean; reason?: string } {
  const maxOps = policy.maxOps ?? 6;
  if (tx.operations.length === 0) return { ok: false, reason: "no operations" };
  if (tx.operations.length > maxOps) return { ok: false, reason: "too many ops" };
  if (tx.source !== policy.expectedSource)
    return { ok: false, reason: `unexpected source ${tx.source}` };

  for (const op of tx.operations) {
    if (!ALLOWED_INNER_OP_TYPES.has(op.type))
      return { ok: false, reason: `disallowed op: ${op.type}` };
    if ("source" in op && op.source === policy.sponsor && op.type === "payment")
      return { ok: false, reason: "payment sourced from sponsor (drain attempt)" };
  }
  return { ok: true };
}

/* -------------------------------- main ---------------------------------- */

async function main() {
  console.log("============================================================");
  console.log(" SPIKE #1 — Sponsored 0-XLM Claim (Stellar testnet)");
  console.log("============================================================");

  // Actors
  const issuer = Keypair.random(); // test USDC issuer
  const sponsor = Keypair.random(); // pays reserve + fee
  const sender = Keypair.random(); // the one sending the money (holds USDC)
  const recipient = Keypair.random(); // NEW user — NO friendbot, 0 XLM

  const USDC = new Asset("USDC", issuer.publicKey());

  /* --- 1. fund issuer/sponsor/sender (recipient INTENTIONALLY not funded) --- */
  log("1", "Fund the actors (EXCEPT recipient — it will be born from scratch)");
  await friendbot(issuer.publicKey(), "issuer");
  await friendbot(sponsor.publicKey(), "sponsor");
  await friendbot(sender.publicKey(), "sender");
  console.log(`   ℹ recipient (not funded): ${recipient.publicKey()}`);

  /* --- 2. sender opens USDC trustline, issuer issues 100 USDC --- */
  log("2", "Sender USDC trustline + issuer issues 100 USDC");
  {
    const acc = await server.loadAccount(sender.publicKey());
    const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.changeTrust({ asset: USDC }))
      .setTimeout(180)
      .build();
    tx.sign(sender);
    await submit(tx, "sender changeTrust(USDC)");
  }
  {
    const acc = await server.loadAccount(issuer.publicKey());
    const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(
        Operation.payment({ destination: sender.publicKey(), asset: USDC, amount: "100" }),
      )
      .setTimeout(180)
      .build();
    tx.sign(issuer);
    await submit(tx, "issuer → sender 100 USDC");
  }
  console.log(`   sender USDC balance: ${await assetBalance(sender.publicKey(), "USDC", issuer.publicKey())}`);

  /* --- 3. sender creates a Claimable Balance (two claimants) --- */
  log("3", "Sender creates a 20 USDC Claimable Balance (recipient + sender-reclaim-7d)");
  {
    const acc = await server.loadAccount(sender.publicKey());
    const claimants = [
      // recipient can always claim
      new Claimant(recipient.publicKey(), Claimant.predicateUnconditional()),
      // sender can ONLY reclaim after 7 days (reclaim safety net)
      new Claimant(
        sender.publicKey(),
        Claimant.predicateNot(Claimant.predicateBeforeRelativeTime(RECLAIM_AFTER_SECONDS)),
      ),
    ];
    const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.createClaimableBalance({ asset: USDC, amount: "20", claimants }))
      .setTimeout(180)
      .build();
    tx.sign(sender);
    await submit(tx, "createClaimableBalance(20 USDC)");
  }
  // fetch the CB id
  const cbPage = await server
    .claimableBalances()
    .claimant(recipient.publicKey())
    .limit(1)
    .order("desc")
    .call();
  const balanceId = cbPage.records[0]?.id;
  if (!balanceId) throw new Error("Claimable Balance id not found");
  console.log(`   ✔ Claimable Balance id: ${balanceId}`);

  /* --- 4. SPONSORED ONBOARDING: recipient 0 XLM + USDC trustline --- */
  log("4", "Sponsored onboarding — recipient account (0 XLM) + USDC trustline");
  {
    const sponsorAcc = await server.loadAccount(sponsor.publicKey()); // tx source = sponsor (pays the fee)
    const tx = new TransactionBuilder(sponsorAcc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(
        Operation.beginSponsoringFutureReserves({
          sponsoredId: recipient.publicKey(),
          source: sponsor.publicKey(),
        }),
      )
      .addOperation(
        Operation.createAccount({
          destination: recipient.publicKey(),
          startingBalance: "0", // <<< ZERO XLM
          source: sponsor.publicKey(),
        }),
      )
      .addOperation(Operation.changeTrust({ asset: USDC, source: recipient.publicKey() }))
      .addOperation(Operation.endSponsoringFutureReserves({ source: recipient.publicKey() }))
      .setTimeout(180)
      .build();
    tx.sign(sponsor); // tx source + sponsoring ops
    tx.sign(recipient); // changeTrust + endSponsoring ops
    await submit(tx, "sponsored create + trustline");
  }
  const recipNativeAfterOnboard = await nativeBalance(recipient.publicKey());
  console.log(`   recipient native XLM: ${recipNativeAfterOnboard}  (should be 0)`);
  console.log(
    `   recipient USDC trustline: ${await assetBalance(recipient.publicKey(), "USDC", issuer.publicKey())}`,
  );

  /* --- 5. recipient CLAIMs — sponsor FEE-BUMPs (recipient 0 XLM) --- */
  log("5", "Recipient claimClaimableBalance — sponsor fee-bumps");
  {
    const recipAcc = await server.loadAccount(recipient.publicKey());
    const innerTx = new TransactionBuilder(recipAcc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.claimClaimableBalance({ balanceId }))
      .setTimeout(180)
      .build();
    innerTx.sign(recipient);

    // ANTI-DRAIN: validate the inner tx BEFORE the sponsor signs
    const verdict = validateInnerTransaction(innerTx, {
      expectedSource: recipient.publicKey(),
      sponsor: sponsor.publicKey(),
    });
    if (!verdict.ok) throw new Error(`anti-drain (unexpected) REJECT: ${verdict.reason}`);
    console.log("   ✔ anti-drain validator: inner tx valid (claim op as expected)");

    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      sponsor.publicKey(), // sponsor pays the fee
      "200", // fee-bump base fee (>= inner)
      innerTx,
      NETWORK,
    );
    feeBump.sign(sponsor);
    await submit(feeBump, "fee-bumped claim");
  }
  const recipUsdc = await assetBalance(recipient.publicKey(), "USDC", issuer.publicKey());
  const recipNativeAfterClaim = await nativeBalance(recipient.publicKey());
  console.log(`   recipient USDC balance: ${recipUsdc}  (should be 20)`);
  console.log(`   recipient native XLM: ${recipNativeAfterClaim}  (should still be 0)`);

  /* --- 6. ANTI-DRAIN NEGATIVE TEST: malicious inner tx must be rejected --- */
  log("6", "Anti-drain negative test — malicious inner tx must be REJECTED");
  {
    const recipAcc = await server.loadAccount(recipient.publicKey());
    // Attack: attach a payment draining the sponsor onto the recipient's claim
    const evilTx = new TransactionBuilder(recipAcc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.claimClaimableBalance({ balanceId }))
      .addOperation(
        Operation.payment({
          destination: recipient.publicKey(),
          asset: Asset.native(),
          amount: "5",
          source: sponsor.publicKey(), // <<< attempt to drain the sponsor
        }),
      )
      .setTimeout(180)
      .build();
    const verdict = validateInnerTransaction(evilTx, {
      expectedSource: recipient.publicKey(),
      sponsor: sponsor.publicKey(),
    });
    if (verdict.ok) {
      throw new Error("✗ FAIL: anti-drain MISSED the malicious tx");
    }
    console.log(`   ✔ anti-drain rejected the malicious tx → "${verdict.reason}"`);
  }

  /* ------------------------------ RESULT ------------------------------ */
  const pass =
    recipNativeAfterClaim === "0.0000000" &&
    Number.parseFloat(recipUsdc) === 20 &&
    recipNativeAfterOnboard === "0.0000000";

  console.log("\n============================================================");
  console.log(pass ? " ✅ SPIKE #1 PASS" : " ❌ SPIKE #1 FAIL");
  console.log("============================================================");
  console.log(` recipient: ${recipient.publicKey()}`);
  console.log(` • onboarded with 0 XLM        : ${recipNativeAfterOnboard === "0.0000000"}`);
  console.log(` • claimed 20 USDC             : ${Number.parseFloat(recipUsdc) === 20}`);
  console.log(` • still 0 XLM after claim     : ${recipNativeAfterClaim === "0.0000000"}`);
  console.log(` • anti-drain works            : true`);
  console.log("\n Economic backbone proven: the sponsor paid ALL reserve+fee,");
  console.log(" the user received USDC with ZERO XLM. (Stack §3.3 + day-1 spike #1)");

  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error("\n💥 SPIKE crashed:", e);
  process.exit(1);
});
