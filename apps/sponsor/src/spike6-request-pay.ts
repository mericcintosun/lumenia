/**
 * ============================================================================
 *  SPIKE #6 — Request money, returning-asker path (Stellar testnet)
 * ============================================================================
 *
 *  GOAL: prove the request-money §5.1 decision before any UI — that BOTH policy
 *  gates accept the returning-asker shape UNCHANGED, and that the /send-link
 *  balanceId now comes from the transaction result (the race fix).
 *
 *  What is proven, through the REAL deployed handlers (sendLinkHandler +
 *  feebumpHandler — the same modules the live endpoints run):
 *    1. A payer's CB with claimants [ASKER ADDRESS unconditional, payer
 *       reclaim-7d] passes the UNCHANGED send anti-drain policy — the
 *       unconditional claimant's destination was never constrained to be a
 *       fresh bearer key, so "pay a request straight to the asker's account"
 *       needs zero allowlist change.
 *    2. The returned balanceId resolves to its OWN transaction's CB (two sends
 *       with different amounts each map to their own). Honest limit: the sends
 *       are sequential, so this asserts id-correctness, not the concurrent race
 *       itself — and sendLinkHandler's claimant-lookup FALLBACK would also pass
 *       it. The guard against the fallback silently returning is the loud
 *       console.warn in sendLinkHandler, not this spike.
 *    3. The asker's EXISTING 0-XLM account claims it through the UNCHANGED
 *       /feebump claim policy (bare claimClaimableBalance, maxOps 1) — the
 *       same live endpoint the bearer claim uses.
 *    4. The sponsor's reserve lock is released on claim (num_sponsoring back
 *       to baseline) and the asker still holds 0 XLM.
 *
 *  RUN:  pnpm --filter @lumenia/sponsor spike6
 *  NEEDS: internet (Horizon testnet + friendbot). Self-contained — bootstraps
 *         its own sponsor + issuer. Testnet only, no real money.
 * ============================================================================
 */
import {
  Asset,
  BASE_FEE,
  Claimant,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { makeConfig } from "./lib/config.js";
import { signerFromSecret } from "./lib/signer.js";
import { friendbot, submit } from "./lib/stellar.js";
import { sendLinkHandler } from "./lib/send.js";
import { feebumpHandler } from "./lib/feebump.js";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK = Networks.TESTNET;
const server = new Horizon.Server(HORIZON_URL);
const RECLAIM = (7 * 24 * 60 * 60).toString(); // the product's real reclaim window
const FUND = "50";
const ASK_A = "7";
const ASK_B = "9";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ✔ ${name}${detail ? `  (${detail})` : ""}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? `  (${detail})` : ""}`);
    fail++;
  }
}

async function xlm(pub: string): Promise<string> {
  const acc = await server.loadAccount(pub);
  return acc.balances.find((b) => b.asset_type === "native")?.balance ?? "0";
}
async function usdc(pub: string, asset: Asset): Promise<string> {
  const acc = await server.loadAccount(pub);
  const line = acc.balances.find(
    (b) => "asset_code" in b && b.asset_code === asset.getCode() && "asset_issuer" in b && b.asset_issuer === asset.getIssuer(),
  );
  return line ? line.balance : "NO_TRUSTLINE";
}
async function numSponsoring(pub: string): Promise<number> {
  const acc = (await server.loadAccount(pub)) as unknown as { num_sponsoring?: number };
  return acc.num_sponsoring ?? 0;
}

/** The sponsored 0-XLM onboarding sandwich — what a previous claim leaves behind. */
async function onboard(sponsor: Keypair, who: Keypair, asset: Asset): Promise<void> {
  const acc = await server.loadAccount(sponsor.publicKey());
  const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: who.publicKey(), source: sponsor.publicKey() }))
    .addOperation(Operation.createAccount({ destination: who.publicKey(), startingBalance: "0", source: sponsor.publicKey() }))
    .addOperation(Operation.changeTrust({ asset, source: who.publicKey() }))
    .addOperation(Operation.endSponsoringFutureReserves({ source: who.publicKey() }))
    .setTimeout(180)
    .build();
  tx.sign(sponsor);
  tx.sign(who);
  await submit(server, tx);
}

/** The request-pay inner tx: payer's CB claimable by the ASKER'S ADDRESS. */
async function buildRequestPay(sponsorPub: string, payer: Keypair, askerPub: string, asset: Asset, amount: string) {
  const acc = await server.loadAccount(payer.publicKey());
  const claimants = [
    new Claimant(askerPub, Claimant.predicateUnconditional()),
    new Claimant(payer.publicKey(), Claimant.predicateNot(Claimant.predicateBeforeRelativeTime(RECLAIM))),
  ];
  const inner = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: payer.publicKey(), source: sponsorPub }))
    .addOperation(Operation.createClaimableBalance({ asset, amount, claimants, source: payer.publicKey() }))
    .addOperation(Operation.endSponsoringFutureReserves({ source: payer.publicKey() }))
    .setTimeout(180)
    .build();
  inner.sign(payer);
  return inner;
}

async function main() {
  console.log("============================================================");
  console.log(" SPIKE #6 — request money: pay to the asker's ADDRESS");
  console.log("============================================================\n");

  console.log("[0] bootstrap sponsor + issuer (friendbot)");
  const sponsor = Keypair.random();
  const issuer = Keypair.random();
  await Promise.all([friendbot(sponsor.publicKey()), friendbot(issuer.publicKey())]);
  const USDC = new Asset("USDC", issuer.publicKey());
  const config = makeConfig({ network: "testnet", sponsorSecret: sponsor.secret(), usdcIssuer: issuer.publicKey() });
  const signer = signerFromSecret(sponsor.secret());

  console.log("[1] onboard the ASKER — an existing 0-XLM account (what a past claim leaves)");
  const asker = Keypair.random();
  await onboard(sponsor, asker, USDC);

  console.log("[2] onboard the PAYER (0-XLM) + issuer funds them with USDC");
  const payer = Keypair.random();
  await onboard(sponsor, payer, USDC);
  {
    const acc = await server.loadAccount(issuer.publicKey());
    const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.payment({ destination: payer.publicKey(), asset: USDC, amount: FUND }))
      .setTimeout(180)
      .build();
    tx.sign(issuer);
    await submit(server, tx);
  }
  const sponsoringBaseline = await numSponsoring(sponsor.publicKey());

  console.log(`\n[3] request-pay $${ASK_A} through the REAL sendLinkHandler (unchanged policy)`);
  const innerA = await buildRequestPay(sponsor.publicKey(), payer, asker.publicKey(), USDC, ASK_A);
  const resA = await sendLinkHandler(server, config, signer, { xdr: innerA.toXDR(), senderPublicKey: payer.publicKey() });
  check("send policy accepts the address-claimant CB (no allowlist change)", typeof resA.balanceId === "string", resA.hash);

  console.log(`\n[4] a second request-pay $${ASK_B} — the returned ids must each be THIS tx's`);
  const innerB = await buildRequestPay(sponsor.publicKey(), payer, asker.publicKey(), USDC, ASK_B);
  const resB = await sendLinkHandler(server, config, signer, { xdr: innerB.toXDR(), senderPublicKey: payer.publicKey() });
  check("second send returns a DIFFERENT id", resB.balanceId !== resA.balanceId);
  const cbA = (await server.claimableBalances().claimableBalance(resA.balanceId).call()) as unknown as { amount: string };
  const cbB = (await server.claimableBalances().claimableBalance(resB.balanceId).call()) as unknown as { amount: string };
  check(`id A resolves to its own amount ($${ASK_A})`, Number(cbA.amount) === Number(ASK_A), cbA.amount);
  check(`id B resolves to its own amount ($${ASK_B})`, Number(cbB.amount) === Number(ASK_B), cbB.amount);

  console.log("\n[5] the ASKER claims $" + ASK_A + " with her EXISTING account via the REAL feebumpHandler");
  {
    const acc = await server.loadAccount(asker.publicKey());
    const inner = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.claimClaimableBalance({ balanceId: resA.balanceId }))
      .setTimeout(180)
      .build();
    inner.sign(asker);
    const fb = await feebumpHandler(server, config, signer, {
      xdr: inner.toXDR(),
      recipientPublicKey: asker.publicKey(),
      balanceId: resA.balanceId,
    });
    check("claim policy accepts the existing account's bare claim (unchanged)", typeof fb.hash === "string", fb.hash);
  }

  console.log("\n[6] verify balances + the sponsor's reserve");
  const askerUsdc = await usdc(asker.publicKey(), USDC);
  const askerXlm = await xlm(asker.publicKey());
  const sponsoringAfter = await numSponsoring(sponsor.publicKey());
  check("asker received the money into her account", Number(askerUsdc) === Number(ASK_A), `${askerUsdc} USDC`);
  check("asker still holds 0 XLM (sponsor paid everything)", askerXlm === "0.0000000", `${askerXlm} XLM`);
  check(
    "claimed CB's reserve released (only the open $" + ASK_B + " CB still sponsored)",
    sponsoringAfter === sponsoringBaseline + 2,
    `baseline ${sponsoringBaseline} → ${sponsoringAfter} (one open 2-claimant CB)`,
  );

  console.log("\n============================================================");
  console.log(fail === 0 ? ` ✅ SPIKE #6 PASS (${pass}/${pass + fail})` : ` ❌ SPIKE #6 FAIL (${fail} failed)`);
  console.log("============================================================");
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error("\n💥 spike6 failed:", (e as Error).message);
  process.exit(1);
});
