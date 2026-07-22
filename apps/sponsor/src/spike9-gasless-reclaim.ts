/**
 * ============================================================================
 *  SPIKE #9 — Gasless sender-reclaim (C2 recovery lever)
 * ============================================================================
 *
 *  C2 CONTEXT: a v1 send sponsors a Claimable Balance whose ~1 XLM reserve is the
 *  SPONSOR's, locked until the CB is claimed. The sponsor CANNOT self-recover it
 *  (revokeSponsorship is rejected on a ClaimableBalanceEntry; a sponsor-claimant would
 *  take the sender's USDC → non-custody). The ONLY non-custodial recovery is the
 *  sender-reclaim claimant: after the reclaim window the sender claims their OWN CB,
 *  which returns their USDC AND frees the sponsor's reserve.
 *
 *  HYPOTHESIS PROVEN HERE: a "reclaim" is just a `claimClaimableBalance` whose claimer
 *  is the SENDER — so the EXISTING /feebump path handles it gaslessly, with NO new
 *  sponsor code. The missing piece for the product is only the UI/nudge (surface the
 *  reclaimable CBs + a button), not backend plumbing.
 *
 *  WHAT THIS SPIKE SHOWS (end to end, via the REAL lib handlers):
 *    1. a 0-XLM sponsored sender creates a sponsored CB (recipient + sender-reclaim),
 *       sponsor fee-bumps → 1 sponsored CB, sender USDC now escrowed, sponsor reserve locked
 *    2. the link is ABANDONED (recipient never claims); after the reclaim window
 *    3. the sender reclaims via the SAME /feebump handler (claimer = sender) → USDC
 *       returns to the sender, sponsor's sponsored-CB count 1 → 0 (reserve freed), and the
 *       sender still holds 0 XLM (gasless throughout).
 *
 *  RUN:   pnpm --filter @lumenia/sponsor spike9
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
  Claimant,
  BASE_FEE,
  type Transaction,
} from "@stellar/stellar-sdk";
import { makeConfig } from "./lib/config.js";
import { signerFromSecret } from "./lib/signer.js";
import { horizon, friendbot, submit, nativeBalance, trustlineBalance } from "./lib/stellar.js";
import { createAccountHandler } from "./lib/create-account.js";
import { feebumpHandler } from "./lib/feebump.js";

const NETWORK = Networks.TESTNET;
const RECLAIM_WINDOW_SECONDS = 3; // prod is 7 days; a short window keeps the spike fast

function log(step: string, msg: string) {
  console.log(`\n[${step}] ${msg}`);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** How many Claimable Balances the sponsor currently sponsors the reserve for (the C2 stock). */
async function sponsoredCbCount(server: Horizon.Server, sponsor: string): Promise<number> {
  const page = await server.claimableBalances().sponsor(sponsor).limit(200).call();
  return page.records.length;
}

async function main() {
  console.log("============================================================");
  console.log(" SPIKE #9 — Gasless sender-reclaim (C2 recovery lever)");
  console.log("============================================================");

  const issuer = Keypair.random();
  const sponsor = Keypair.random();
  const sender = Keypair.random(); // a NEW 0-XLM sponsored user who will send + then reclaim
  const recipient = Keypair.random(); // the link target — will ABANDON (never claims)
  const USDC = new Asset("USDC", issuer.publicKey());

  log("1", "Fund issuer + sponsor (friendbot); sender is born 0-XLM (sponsored)");
  await Promise.all([friendbot(issuer.publicKey()), friendbot(sponsor.publicKey())]);
  const config = makeConfig({ network: "testnet", sponsorSecret: sponsor.secret(), usdcIssuer: issuer.publicKey() });
  const server = horizon(config);
  const signer = signerFromSecret(config.sponsorSecret);

  log("2", "Onboard the 0-XLM sender (sponsored create-account + USDC trustline)");
  {
    const created = await createAccountHandler(server, config, signer, { recipientPublicKey: sender.publicKey() });
    const tx = TransactionBuilder.fromXDR(created.xdr, NETWORK) as Transaction;
    tx.sign(sender);
    await submit(server, tx);
  }
  // Give the sender some USDC to send (issuer → sender).
  {
    const acc = await server.loadAccount(issuer.publicKey());
    const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.payment({ destination: sender.publicKey(), asset: USDC, amount: "10" }))
      .setTimeout(120)
      .build();
    tx.sign(issuer);
    await submit(server, tx);
  }
  console.log(`   sender: ${await trustlineBalance(server, sender.publicKey(), "USDC", issuer.publicKey())} USDC, ${await nativeBalance(server, sender.publicKey())} XLM`);

  log("3", "Sender sends a $6 link — sponsored CB (recipient + sender-reclaim), sponsor fee-bumps");
  let balanceId: string;
  {
    const senderAcc = await server.loadAccount(sender.publicKey()); // tx.source = sender (0-XLM)
    const claimants = [
      new Claimant(recipient.publicKey(), Claimant.predicateUnconditional()),
      new Claimant(sender.publicKey(), Claimant.predicateNot(Claimant.predicateBeforeRelativeTime(String(RECLAIM_WINDOW_SECONDS)))),
    ];
    const inner = new TransactionBuilder(senderAcc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: sender.publicKey(), source: sponsor.publicKey() }))
      .addOperation(Operation.createClaimableBalance({ asset: USDC, amount: "6", claimants }))
      .addOperation(Operation.endSponsoringFutureReserves({ source: sender.publicKey() }))
      .setTimeout(120)
      .build();
    inner.sign(sender); // sender sources the CB + end
    signer.sign(inner); // sponsor sources the begin op
    const feeBump = TransactionBuilder.buildFeeBumpTransaction(sponsor.publicKey(), "1000", inner, NETWORK);
    signer.sign(feeBump);
    const { resultXdr } = await submit(server, feeBump);
    // read the CB id from THIS tx's result
    const cb = await server.claimableBalances().claimant(recipient.publicKey()).order("desc").limit(1).call();
    balanceId = cb.records[0]!.id;
    void resultXdr;
  }
  const cbCountAfterSend = await sponsoredCbCount(server, sponsor.publicKey());
  const senderUsdcAfterSend = await trustlineBalance(server, sender.publicKey(), "USDC", issuer.publicKey());
  console.log(`   ✔ CB created: ${balanceId.slice(0, 16)}…`);
  console.log(`   sponsored CBs (locked reserve): ${cbCountAfterSend}  · sender USDC now escrowed: ${senderUsdcAfterSend} (was 10, 6 in the CB)`);

  log("4", `Link ABANDONED (recipient never claims). Wait past the ${RECLAIM_WINDOW_SECONDS}s reclaim window…`);
  await sleep((RECLAIM_WINDOW_SECONDS + 2) * 1000);

  log("5", "Sender RECLAIMS gaslessly via the EXISTING /feebump handler (claimer = sender)");
  {
    const senderAcc = await server.loadAccount(sender.publicKey());
    const innerClaim = new TransactionBuilder(senderAcc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.claimClaimableBalance({ balanceId }))
      .setTimeout(120)
      .build();
    innerClaim.sign(sender);
    // The reclaim IS a claim whose claimer is the sender — the same shape /feebump gates.
    const res = await feebumpHandler(server, config, signer, {
      xdr: innerClaim.toXDR(),
      recipientPublicKey: sender.publicKey(), // the claimer (here: the reclaiming sender)
      balanceId,
    });
    console.log(`   ✔ /feebump accepted the reclaim → ${res.hash.slice(0, 16)}…`);
  }

  const cbCountAfterReclaim = await sponsoredCbCount(server, sponsor.publicKey());
  const senderUsdcAfterReclaim = await trustlineBalance(server, sender.publicKey(), "USDC", issuer.publicKey());
  const senderXlmAfterReclaim = await nativeBalance(server, sender.publicKey());

  /* ------------------------------ RESULT ------------------------------ */
  const usdcReturned = Number.parseFloat(senderUsdcAfterReclaim) === 10; // 4 kept + 6 reclaimed = 10
  const reserveFreed = cbCountAfterSend === 1 && cbCountAfterReclaim === 0;
  const stillGasless = senderXlmAfterReclaim === "0.0000000";
  const pass = usdcReturned && reserveFreed && stillGasless;

  console.log("\n============================================================");
  console.log(pass ? " ✅ SPIKE #9 PASS" : " ❌ SPIKE #9 FAIL");
  console.log("============================================================");
  console.log(` sender USDC returned to 10 (6 reclaimed)      : ${usdcReturned}  [${senderUsdcAfterReclaim}]`);
  console.log(` sponsor reserve freed (sponsored CBs 1 → 0)   : ${reserveFreed}  [${cbCountAfterSend} → ${cbCountAfterReclaim}]`);
  console.log(` sender still 0 XLM (gasless reclaim)          : ${stillGasless}  [${senderXlmAfterReclaim}]`);
  console.log("\n The gasless sender-reclaim runs on the EXISTING /feebump handler — the C2");
  console.log(" recovery lever needs only a UI/nudge (list reclaimable sends + a button),");
  console.log(" not new sponsor code. Recovery returns the sender's money AND the reserve.");

  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error("\n💥 SPIKE #9 crashed:", e);
  process.exit(1);
});
