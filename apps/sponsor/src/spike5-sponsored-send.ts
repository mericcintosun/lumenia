/**
 * ============================================================================
 *  SPIKE #5 — Sponsored 0-XLM SEND (Stellar testnet)
 * ============================================================================
 *
 *  GOAL: prove the /send backbone before any UI. A recipient who just claimed
 *  holds a sponsored 0-XLM account with USDC. To send onward they must create a
 *  dual-predicate Claimable Balance — but that needs a base reserve and they hold
 *  0 XLM. So the SPONSOR sponsors the CB reserve too, and fee-bumps.
 *
 *  What is proven (the facts agent A's CAP-0033/CAP-0015 research asserted, now
 *  run end-to-end):
 *    1. A genuinely 0-XLM sender creates a 2-claimant USDC Claimable Balance whose
 *       reserve is charged to the SPONSOR (CB.sponsor == sponsor; sender stays 0 XLM).
 *    2. The inner tx carries ops from TWO sources (sponsor's begin + sender's
 *       create/end), is signed by BOTH, and is accepted inside a sponsor fee-bump.
 *    3. On reclaim (sender, fee-bumped), the reserve returns to the sponsor
 *       (num_sponsoring drops back; the sender's USDC comes back).
 *
 *  RUN:  SPONSOR_SECRET=S... USDC_ISSUER_SECRET=S... pnpm --filter @lumenia/sponsor spike5
 *  NEEDS: internet (Horizon testnet). The sponsor + issuer accounts already exist
 *         and are funded (the deployed testnet keys). No mainnet / real money.
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
  type Transaction,
} from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK = Networks.TESTNET;
const server = new Horizon.Server(HORIZON_URL);
const RECLAIM_AFTER = "5"; // seconds (7 days in prod; short here so the spike can reclaim)
const SEND_AMOUNT = "20";
const FUND_AMOUNT = "50";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing required env: ${name}`);
  return v;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function submit(tx: Transaction | ReturnType<typeof TransactionBuilder.buildFeeBumpTransaction>) {
  try {
    return await server.submitTransaction(tx);
  } catch (e: unknown) {
    const extras = (e as { response?: { data?: { extras?: unknown } } })?.response?.data?.extras;
    throw new Error(`submit failed: ${extras ? JSON.stringify(extras) : (e as Error).message}`);
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

async function main() {
  const sponsor = Keypair.fromSecret(required("SPONSOR_SECRET"));
  const issuer = Keypair.fromSecret(required("USDC_ISSUER_SECRET"));
  const USDC = new Asset("USDC", issuer.publicKey());
  const sender = Keypair.random();
  const bearer = Keypair.random();

  console.log("============================================================");
  console.log(" SPIKE #5 — sponsored 0-XLM send (create claimable balance)");
  console.log("============================================================\n");
  console.log(`  sponsor ${sponsor.publicKey()}`);
  console.log(`  sender  ${sender.publicKey()} (will hold 0 XLM)\n`);

  // [1] Sponsor onboards the sender: 0-XLM account + USDC trustline (sponsored sandwich).
  console.log("[1] sponsor creates the sender (0 XLM + USDC trustline)");
  {
    const acc = await server.loadAccount(sponsor.publicKey());
    const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: sender.publicKey(), source: sponsor.publicKey() }))
      .addOperation(Operation.createAccount({ destination: sender.publicKey(), startingBalance: "0", source: sponsor.publicKey() }))
      .addOperation(Operation.changeTrust({ asset: USDC, source: sender.publicKey() }))
      .addOperation(Operation.endSponsoringFutureReserves({ source: sender.publicKey() }))
      .setTimeout(180)
      .build();
    tx.sign(sponsor);
    tx.sign(sender);
    await submit(tx);
  }

  // [2] Issuer funds the sender with USDC (their spendable money).
  console.log(`[2] issuer funds the sender with ${FUND_AMOUNT} USDC`);
  {
    const acc = await server.loadAccount(issuer.publicKey());
    const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.payment({ destination: sender.publicKey(), asset: USDC, amount: FUND_AMOUNT }))
      .setTimeout(180)
      .build();
    tx.sign(issuer);
    await submit(tx);
  }

  const sponsorNumBefore = await numSponsoring(sponsor.publicKey());
  const sponsorXlmBefore = await xlm(sponsor.publicKey());
  console.log(`    sender: ${await xlm(sender.publicKey())} XLM · ${await usdc(sender.publicKey(), USDC)} USDC`);
  console.log(`    sponsor num_sponsoring=${sponsorNumBefore}, XLM=${sponsorXlmBefore}\n`);

  // [3] THE SEND — 0-XLM sender creates a dual-predicate CB; sponsor sponsors the
  //     reserve (begin/create/end) and fee-bumps. Sender signs create+end; sponsor
  //     ALSO signs the inner tx (for its begin op) — new vs the claim path.
  console.log("[3] 0-XLM sender creates the Claimable Balance (sponsor-reserved + fee-bumped)");
  {
    const acc = await server.loadAccount(sender.publicKey());
    const claimants = [
      new Claimant(bearer.publicKey(), Claimant.predicateUnconditional()),
      new Claimant(sender.publicKey(), Claimant.predicateNot(Claimant.predicateBeforeRelativeTime(RECLAIM_AFTER))),
    ];
    const inner = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: sender.publicKey(), source: sponsor.publicKey() }))
      .addOperation(Operation.createClaimableBalance({ asset: USDC, amount: SEND_AMOUNT, claimants, source: sender.publicKey() }))
      .addOperation(Operation.endSponsoringFutureReserves({ source: sender.publicKey() }))
      .setTimeout(180)
      .build();
    inner.sign(sender); // create + end (sender-sourced)
    inner.sign(sponsor); // begin (sponsor-sourced)
    const bump = TransactionBuilder.buildFeeBumpTransaction(sponsor.publicKey(), "10000", inner, NETWORK);
    bump.sign(sponsor);
    const res = await submit(bump);
    console.log(`    send tx ${res.hash}`);
  }

  // [4] Verify: sender still 0 XLM, USDC down by the sent amount, CB sponsored by the sponsor.
  console.log("\n[4] verify the send");
  const senderXlmAfter = await xlm(sender.publicKey());
  const senderUsdcAfter = await usdc(sender.publicKey(), USDC);
  const cbPage = await server.claimableBalances().claimant(bearer.publicKey()).order("desc").limit(1).call();
  const cb = cbPage.records[0] as unknown as { id: string; sponsor?: string; amount: string } | undefined;
  const sponsorNumAfter = await numSponsoring(sponsor.publicKey());

  check("sender holds 0 XLM (reserve NOT charged to the sender)", senderXlmAfter === "0.0000000", `${senderXlmAfter} XLM`);
  check("sender USDC reduced by the sent amount", Number(senderUsdcAfter) === Number(FUND_AMOUNT) - Number(SEND_AMOUNT), `${senderUsdcAfter} USDC`);
  check("Claimable Balance exists for the bearer", !!cb, cb?.id);
  check("CB reserve is sponsored by the SPONSOR", cb?.sponsor === sponsor.publicKey(), cb?.sponsor);
  check("sponsor num_sponsoring rose by 2 (2 claimants × base reserve)", sponsorNumAfter === sponsorNumBefore + 2, `${sponsorNumBefore}→${sponsorNumAfter}`);

  // [5] Reclaim after the window — sender (0 XLM) reclaims, sponsor fee-bumps; reserve returns.
  console.log(`\n[5] wait ${RECLAIM_AFTER}s, then the sender reclaims (fee-bumped); reserve returns to sponsor`);
  await sleep((Number(RECLAIM_AFTER) + 2) * 1000);
  if (cb) {
    const acc = await server.loadAccount(sender.publicKey());
    const inner = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.claimClaimableBalance({ balanceId: cb.id, source: sender.publicKey() }))
      .setTimeout(180)
      .build();
    inner.sign(sender);
    const bump = TransactionBuilder.buildFeeBumpTransaction(sponsor.publicKey(), "10000", inner, NETWORK);
    bump.sign(sponsor);
    const res = await submit(bump);
    console.log(`    reclaim tx ${res.hash}`);
  }

  const senderUsdcReclaim = await usdc(sender.publicKey(), USDC);
  const sponsorNumReclaim = await numSponsoring(sponsor.publicKey());
  check("sender USDC restored after reclaim", Number(senderUsdcReclaim) === Number(FUND_AMOUNT), `${senderUsdcReclaim} USDC`);
  check("sponsor num_sponsoring returned to baseline (reserve released)", sponsorNumReclaim === sponsorNumBefore, `${sponsorNumAfter}→${sponsorNumReclaim}`);

  console.log("\n============================================================");
  console.log(fail === 0 ? ` ✅ SPIKE #5 PASS (${pass}/${pass + fail})` : ` ❌ SPIKE #5 FAIL (${fail} failed)`);
  console.log("============================================================");
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error("\n💥 spike5 failed:", (e as Error).message);
  process.exit(1);
});
