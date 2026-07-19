/**
 * ============================================================================
 *  TEST — anti-drain validator (the canonical validator now lives at
 *  apps/sponsor/src/lib/anti-drain.ts — moved out of packages/shared for the
 *  Vercel deploy boundary; this test imports ./lib/anti-drain.js directly)
 * ============================================================================
 *
 *  Addresses the code-review finding: op-type allowlisting is
 *  not enough; the validator must check op SOURCE and sensitive PARAMETERS.
 *  These cases prove the hardened validator accepts the legit claim + send + sweep
 *  shapes and rejects every reserve/principal drain vector we could think of
 *  (37/37 = 18 claim + 7 send + 12 sweep). The sweep policy (validateSweepTransaction)
 *  is a SEPARATE tight allowlist — the claim/send allowlists are never widened.
 *
 *  RUN:
 *    pnpm --filter @lumenia/sponsor test:antidrain
 *
 *  No network required — txs are built in memory and validated.
 * ============================================================================
 */

import assert from "node:assert/strict";
import {
  Account,
  Asset,
  Claimant,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  BASE_FEE,
  type Transaction,
  type xdr,
} from "@stellar/stellar-sdk";
// the deployed validator (same module the live /feebump imports)
import {
  validateInnerTransaction,
  validateSweepTransaction,
  ALLOWED_SEND_OP_TYPES,
  type InnerTxPolicy,
  type SweepPolicy,
} from "./lib/anti-drain.js";

const NETWORK = Networks.TESTNET;

const recipient = Keypair.random();
const sponsor = Keypair.random();
const issuer = Keypair.random();
const attacker = Keypair.random();
const anchor = Keypair.random(); // an allow-listed payment destination
const bearer = Keypair.random(); // the /send onward-recipient (CB claimant)

const USDC = new Asset("USDC", issuer.publicKey());
const WRONG = new Asset("DAI", issuer.publicKey());
const BALANCE_ID = "00000000" + "ab".repeat(32); // valid CB id shape (8 + 64 hex)
const OTHER_BALANCE_ID = "00000000" + "cd".repeat(32);

const basePolicy: InnerTxPolicy = {
  expectedSource: recipient.publicKey(),
  sponsor: sponsor.publicKey(),
  expectedAsset: USDC,
  expectedBalanceId: BALANCE_ID,
  maxOps: 6,
};

/** Build a Transaction with the given ops, sourced by `source`. (in-memory, no network) */
function buildTx(sourcePub: string, ops: xdr.Operation[]): Transaction {
  const acc = new Account(sourcePub, "123456789"); // fake sequence; we never submit
  const b = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK });
  for (const op of ops) b.addOperation(op);
  return b.setTimeout(180).build();
}

let passed = 0;
let failed = 0;

function check(name: string, got: { ok: boolean; reason?: string }, wantOk: boolean, reasonIncludes?: string) {
  try {
    assert.equal(got.ok, wantOk, `${name}: expected ok=${wantOk}, got ok=${got.ok} (${got.reason ?? ""})`);
    if (!wantOk && reasonIncludes) {
      assert.ok(
        (got.reason ?? "").toLowerCase().includes(reasonIncludes.toLowerCase()),
        `${name}: reason "${got.reason}" should include "${reasonIncludes}"`,
      );
    }
    console.log(`  ✔ ${name}${wantOk ? "" : `  → rejected: "${got.reason}"`}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}: ${(e as Error).message}`);
    failed++;
  }
}

console.log("============================================================");
console.log(" TEST — anti-drain validator (hardened)");
console.log("============================================================\n");

/* ---- POSITIVE: the real claim inner tx (recipient-sourced) ---- */
check(
  "G1 legit claim (recipient source, correct balanceId)",
  validateInnerTransaction(buildTx(recipient.publicKey(), [Operation.claimClaimableBalance({ balanceId: BALANCE_ID })]), basePolicy),
  true,
);

/* ---- POSITIVE: combined onboarding+claim defense shape ---- */
check(
  "G2 combined sponsored shape (begin/create0/changeTrust/end/claim)",
  validateInnerTransaction(
    buildTx(recipient.publicKey(), [
      Operation.beginSponsoringFutureReserves({ sponsoredId: recipient.publicKey(), source: sponsor.publicKey() }),
      Operation.createAccount({ destination: recipient.publicKey(), startingBalance: "0", source: sponsor.publicKey() }),
      Operation.changeTrust({ asset: USDC, source: recipient.publicKey() }),
      Operation.endSponsoringFutureReserves({ source: recipient.publicKey() }),
      Operation.claimClaimableBalance({ balanceId: BALANCE_ID }),
    ]),
    basePolicy,
  ),
  true,
);

/* ---- POSITIVE: claim + payment to an allow-listed destination ---- */
check(
  "G3 claim + payment to allow-listed anchor",
  validateInnerTransaction(
    buildTx(recipient.publicKey(), [
      Operation.claimClaimableBalance({ balanceId: BALANCE_ID }),
      Operation.payment({ destination: anchor.publicKey(), asset: USDC, amount: "5" }),
    ]),
    { ...basePolicy, allowedPaymentDestinations: new Set([anchor.publicKey()]) },
  ),
  true,
);

/* ---- DRAIN VECTORS (must all be rejected) ---- */

check(
  "R1 wrong tx source (sponsor builds the inner tx)",
  validateInnerTransaction(buildTx(sponsor.publicKey(), [Operation.claimClaimableBalance({ balanceId: BALANCE_ID })]), basePolicy),
  false,
  "unexpected tx source",
);

check(
  "R2 disallowed op type (bumpSequence)",
  validateInnerTransaction(buildTx(recipient.publicKey(), [Operation.bumpSequence({ bumpTo: "999" })]), basePolicy),
  false,
  "disallowed op type",
);

check(
  "R3 claim with wrong balanceId",
  validateInnerTransaction(buildTx(recipient.publicKey(), [Operation.claimClaimableBalance({ balanceId: OTHER_BALANCE_ID })]), basePolicy),
  false,
  "balanceid",
);

check(
  "R4 payment sourced from sponsor (classic drain)",
  validateInnerTransaction(
    buildTx(recipient.publicKey(), [
      Operation.claimClaimableBalance({ balanceId: BALANCE_ID }),
      Operation.payment({ destination: attacker.publicKey(), asset: Asset.native(), amount: "5", source: sponsor.publicKey() }),
    ]),
    basePolicy,
  ),
  false,
  "sponsor",
);

check(
  "R5 payment to non-allow-listed destination (no allowlist set)",
  validateInnerTransaction(
    buildTx(recipient.publicKey(), [
      Operation.claimClaimableBalance({ balanceId: BALANCE_ID }),
      Operation.payment({ destination: attacker.publicKey(), asset: USDC, amount: "5" }),
    ]),
    basePolicy,
  ),
  false,
  "non-allowlisted",
);

check(
  "R6 createAccount with startingBalance > 0 (XLM drain)",
  validateInnerTransaction(
    buildTx(recipient.publicKey(), [
      Operation.beginSponsoringFutureReserves({ sponsoredId: recipient.publicKey(), source: sponsor.publicKey() }),
      Operation.createAccount({ destination: recipient.publicKey(), startingBalance: "100", source: sponsor.publicKey() }),
      Operation.endSponsoringFutureReserves({ source: recipient.publicKey() }),
      Operation.claimClaimableBalance({ balanceId: BALANCE_ID }),
    ]),
    basePolicy,
  ),
  false,
  "startingbalance",
);

check(
  "R7 changeTrust sourced from sponsor (reserve drain)",
  validateInnerTransaction(
    buildTx(recipient.publicKey(), [
      Operation.changeTrust({ asset: USDC, source: sponsor.publicKey() }),
      Operation.claimClaimableBalance({ balanceId: BALANCE_ID }),
    ]),
    basePolicy,
  ),
  false,
  "sponsor",
);

check(
  "R8 changeTrust with wrong asset",
  validateInnerTransaction(
    buildTx(recipient.publicKey(), [
      Operation.changeTrust({ asset: WRONG, source: recipient.publicKey() }),
      Operation.claimClaimableBalance({ balanceId: BALANCE_ID }),
    ]),
    basePolicy,
  ),
  false,
  "expected asset",
);

check(
  "R9 too many ops",
  validateInnerTransaction(
    buildTx(
      recipient.publicKey(),
      Array.from({ length: 7 }, () => Operation.claimClaimableBalance({ balanceId: BALANCE_ID })),
    ),
    basePolicy,
  ),
  false,
  "too many ops",
);

check(
  "R10 createAccount destination != recipient",
  validateInnerTransaction(
    buildTx(recipient.publicKey(), [
      Operation.beginSponsoringFutureReserves({ sponsoredId: recipient.publicKey(), source: sponsor.publicKey() }),
      Operation.createAccount({ destination: attacker.publicKey(), startingBalance: "0", source: sponsor.publicKey() }),
      Operation.endSponsoringFutureReserves({ source: recipient.publicKey() }),
    ]),
    basePolicy,
  ),
  false,
  "destination",
);

check(
  "R11 beginSponsoring sponsoredId != recipient",
  validateInnerTransaction(
    buildTx(recipient.publicKey(), [
      Operation.beginSponsoringFutureReserves({ sponsoredId: attacker.publicKey(), source: sponsor.publicKey() }),
      Operation.endSponsoringFutureReserves({ source: recipient.publicKey() }),
    ]),
    basePolicy,
  ),
  false,
  "sponsoredid",
);

/* ---- STRICT-MODE FAIL-CLOSED VECTORS (a forgotten policy field must reject) ---- */

check(
  "S1 changeTrust with no expectedAsset set (strict mode rejects)",
  validateInnerTransaction(
    buildTx(recipient.publicKey(), [
      Operation.changeTrust({ asset: USDC, source: recipient.publicKey() }),
      Operation.claimClaimableBalance({ balanceId: BALANCE_ID }),
    ]),
    { expectedSource: recipient.publicKey(), sponsor: sponsor.publicKey(), expectedBalanceId: BALANCE_ID }, // expectedAsset omitted
  ),
  false,
  "strict mode",
);

check(
  "S2 claim with no expectedBalanceId set (strict mode rejects)",
  validateInnerTransaction(
    buildTx(recipient.publicKey(), [Operation.claimClaimableBalance({ balanceId: BALANCE_ID })]),
    { expectedSource: recipient.publicKey(), sponsor: sponsor.publicKey(), expectedAsset: USDC }, // expectedBalanceId omitted
  ),
  false,
  "strict mode",
);

check(
  "S3 op sourced by a third party (neither sponsor nor recipient) fails closed",
  validateInnerTransaction(
    buildTx(recipient.publicKey(), [Operation.claimClaimableBalance({ balanceId: BALANCE_ID, source: attacker.publicKey() })]),
    basePolicy,
  ),
  false,
  "must be sourced by the recipient",
);

/* ---- ESCAPE HATCH: explicit opt-out re-enables the permissive behavior ---- */

check(
  "S4 explicit allowUncheckedAsset re-permits an unconstrained changeTrust",
  validateInnerTransaction(
    buildTx(recipient.publicKey(), [
      Operation.changeTrust({ asset: USDC, source: recipient.publicKey() }),
      Operation.claimClaimableBalance({ balanceId: BALANCE_ID }),
    ]),
    { expectedSource: recipient.publicKey(), sponsor: sponsor.publicKey(), expectedBalanceId: BALANCE_ID, allowUncheckedAsset: true },
  ),
  true,
);

/* ---- /send SHAPE: a 0-XLM sender creates a sponsor-reserved Claimable Balance ---- */

const RECLAIM = "604800"; // 7 days
const goodClaimants = [
  new Claimant(bearer.publicKey(), Claimant.predicateUnconditional()),
  new Claimant(recipient.publicKey(), Claimant.predicateNot(Claimant.predicateBeforeRelativeTime(RECLAIM))),
];
function sendOps(claimants: Claimant[], asset: Asset = USDC, cbSource: string = recipient.publicKey()): xdr.Operation[] {
  return [
    Operation.beginSponsoringFutureReserves({ sponsoredId: recipient.publicKey(), source: sponsor.publicKey() }),
    Operation.createClaimableBalance({ asset, amount: "20", claimants, source: cbSource }),
    Operation.endSponsoringFutureReserves({ source: recipient.publicKey() }),
  ];
}
const sendPolicy: InnerTxPolicy = {
  expectedSource: recipient.publicKey(), // the sender sources the tx + the CB
  sponsor: sponsor.publicKey(),
  expectedAsset: USDC,
  allowedOpTypes: ALLOWED_SEND_OP_TYPES,
  expectedClaimantCount: 2,
  maxOps: 3,
};

check(
  "SEND-G valid send shape (begin/createCB[bearer-uncond + sender-reclaim]/end)",
  validateInnerTransaction(buildTx(recipient.publicKey(), sendOps(goodClaimants)), sendPolicy),
  true,
);
check(
  "SEND-R1 createClaimableBalance sourced by the sponsor (spends sponsor USDC)",
  validateInnerTransaction(buildTx(recipient.publicKey(), sendOps(goodClaimants, USDC, sponsor.publicKey())), sendPolicy),
  false,
  "sponsor",
);
check(
  "SEND-R2 createClaimableBalance wrong asset",
  validateInnerTransaction(buildTx(recipient.publicKey(), sendOps(goodClaimants, WRONG)), sendPolicy),
  false,
  "expected asset",
);
check(
  "SEND-R3 too many claimants (reserve-lock griefing)",
  validateInnerTransaction(
    buildTx(
      recipient.publicKey(),
      sendOps([...goodClaimants, new Claimant(attacker.publicKey(), Claimant.predicateUnconditional())]),
    ),
    sendPolicy,
  ),
  false,
  "claimants",
);
check(
  "SEND-R4 no unconditional claimant (reserve could lock forever)",
  validateInnerTransaction(
    buildTx(
      recipient.publicKey(),
      sendOps([
        new Claimant(bearer.publicKey(), Claimant.predicateBeforeRelativeTime("100")),
        new Claimant(recipient.publicKey(), Claimant.predicateNot(Claimant.predicateBeforeRelativeTime(RECLAIM))),
      ]),
    ),
    sendPolicy,
  ),
  false,
  "unconditional",
);
check(
  "SEND-R5 sender is not a claimant (no reclaim path)",
  validateInnerTransaction(
    buildTx(
      recipient.publicKey(),
      sendOps([
        new Claimant(bearer.publicKey(), Claimant.predicateUnconditional()),
        new Claimant(attacker.publicKey(), Claimant.predicateUnconditional()),
      ]),
    ),
    sendPolicy,
  ),
  false,
  "reclaim claimant",
);
check(
  "SEND-R6 the CLAIM policy rejects createClaimableBalance (allowlist never widened)",
  validateInnerTransaction(buildTx(recipient.publicKey(), sendOps(goodClaimants)), basePolicy),
  false,
  "disallowed op type",
);

/* ---- /sweep SHAPE: consolidate a per-link throwaway account into ONE home account ----
 * A SEPARATE tight policy (validateSweepTransaction). Order-pinned:
 *   [claim, payment(→home), changeTrust(limit 0), accountMerge(→home)], all throwaway-sourced.
 * The sponsor sources nothing + reclaims the throwaway's reserves on merge (Spike #7). */

const home = Keypair.random();
const throwaway = Keypair.random();
const SWEEP_AMOUNT = "12";

function sweepOps(opts: {
  balanceId?: string;
  payDest?: string;
  payAsset?: Asset;
  payAmount?: string;
  ctAsset?: Asset;
  ctLimit?: string;
  mergeDest?: string;
  sponsorSourcesPayment?: boolean;
} = {}): xdr.Operation[] {
  return [
    Operation.claimClaimableBalance({ balanceId: opts.balanceId ?? BALANCE_ID, source: throwaway.publicKey() }),
    Operation.payment({
      destination: opts.payDest ?? home.publicKey(),
      asset: opts.payAsset ?? USDC,
      amount: opts.payAmount ?? SWEEP_AMOUNT,
      source: opts.sponsorSourcesPayment ? sponsor.publicKey() : throwaway.publicKey(),
    }),
    Operation.changeTrust({ asset: opts.ctAsset ?? USDC, limit: opts.ctLimit ?? "0", source: throwaway.publicKey() }),
    Operation.accountMerge({ destination: opts.mergeDest ?? home.publicKey(), source: throwaway.publicKey() }),
  ];
}
const sweepPolicy: SweepPolicy = {
  throwaway: throwaway.publicKey(),
  sponsor: sponsor.publicKey(),
  home: home.publicKey(),
  usdc: USDC,
  expectedBalanceId: BALANCE_ID,
  expectedAmount: SWEEP_AMOUNT,
};
function checkSweep(name: string, ops: xdr.Operation[], wantOk: boolean, reasonIncludes?: string) {
  check(name, validateSweepTransaction(buildTx(throwaway.publicKey(), ops), sweepPolicy), wantOk, reasonIncludes);
}

checkSweep("SWEEP-G valid consolidation (claim/pay→home/changeTrust0/merge→home)", sweepOps(), true);
checkSweep("SWEEP-R1 payment to a non-home destination (fund exfil attempt)", sweepOps({ payDest: attacker.publicKey() }), false, "destination");
checkSweep("SWEEP-R2 changeTrust that ADDS trust (limit != 0)", sweepOps({ ctLimit: "1000" }), false, "limit 0");
checkSweep("SWEEP-R3 accountMerge to a non-home destination", sweepOps({ mergeDest: attacker.publicKey() }), false, "destination");
checkSweep("SWEEP-R4 wrong claim balanceId", sweepOps({ balanceId: OTHER_BALANCE_ID }), false, "balanceid");
checkSweep("SWEEP-R5 an op sourced by the sponsor (sponsor sources nothing here)", sweepOps({ sponsorSourcesPayment: true }), false, "sponsor");
checkSweep("SWEEP-R6 wrong asset on the payment", sweepOps({ payAsset: WRONG }), false, "usdc");
check(
  "SWEEP-R7 wrong op order (payment before claim)",
  validateSweepTransaction(
    buildTx(throwaway.publicKey(), [
      Operation.payment({ destination: home.publicKey(), asset: USDC, amount: SWEEP_AMOUNT, source: throwaway.publicKey() }),
      Operation.claimClaimableBalance({ balanceId: BALANCE_ID, source: throwaway.publicKey() }),
      Operation.changeTrust({ asset: USDC, limit: "0", source: throwaway.publicKey() }),
      Operation.accountMerge({ destination: home.publicKey(), source: throwaway.publicKey() }),
    ]),
    sweepPolicy,
  ),
  false,
  "must be",
);
check(
  "SWEEP-R8 the CLAIM policy never allows accountMerge (allowlist not widened)",
  validateInnerTransaction(
    buildTx(throwaway.publicKey(), [
      Operation.claimClaimableBalance({ balanceId: BALANCE_ID, source: throwaway.publicKey() }),
      Operation.accountMerge({ destination: home.publicKey(), source: throwaway.publicKey() }),
    ]),
    { ...basePolicy, expectedSource: throwaway.publicKey() },
  ),
  false,
  "disallowed op type",
);

// The 3-op "already-claimed" shape — the PRODUCTION shape: the frozen /c/[id] route
// claims the CB at claim time, so consolidation sweeps plain USDC with NO claim op.
const sweepPolicyClaimless: SweepPolicy = {
  throwaway: throwaway.publicKey(),
  sponsor: sponsor.publicKey(),
  home: home.publicKey(),
  usdc: USDC,
  expectedAmount: SWEEP_AMOUNT,
};
function sweepTail(payDest: string = home.publicKey()): xdr.Operation[] {
  return [
    Operation.payment({ destination: payDest, asset: USDC, amount: SWEEP_AMOUNT, source: throwaway.publicKey() }),
    Operation.changeTrust({ asset: USDC, limit: "0", source: throwaway.publicKey() }),
    Operation.accountMerge({ destination: home.publicKey(), source: throwaway.publicKey() }),
  ];
}
check(
  "SWEEP-G2 valid already-claimed 3-op (payment→home/changeTrust0/merge→home, no claim)",
  validateSweepTransaction(buildTx(throwaway.publicKey(), sweepTail()), sweepPolicyClaimless),
  true,
);
check(
  "SWEEP-R9 a claim op present but no expectedBalanceId (strict fail-closed)",
  validateSweepTransaction(buildTx(throwaway.publicKey(), sweepOps()), sweepPolicyClaimless),
  false,
  "expectedbalanceid",
);
check(
  "SWEEP-R10 claimless sweep still pins the payment destination to home",
  validateSweepTransaction(buildTx(throwaway.publicKey(), sweepTail(attacker.publicKey())), sweepPolicyClaimless),
  false,
  "destination",
);

console.log("\n============================================================");
console.log(failed === 0 ? ` ✅ ANTI-DRAIN TESTS PASS (${passed}/${passed + failed})` : ` ❌ ANTI-DRAIN TESTS FAIL (${failed} failed)`);
console.log("============================================================");
if (failed > 0) process.exit(1);
