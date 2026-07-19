/**
 * ============================================================================
 *  SPIKE #7 — "one home account" consolidation / sweep (Stellar testnet)
 * ============================================================================
 *
 *  THE BUG (found in a live user test): every claimed link uses its OWN bearer
 *  key = its OWN account. keystore.ts overwrites a single "primary" record, so
 *  claiming a 2nd incoming link orphans the 1st account and its balance. A real
 *  tester lost access to $2. See docs/RECOVERY_ARCHITECTURE.md.
 *
 *  THE FIX proven here: incoming money is SWEPT into the user's ONE persistent
 *  "home" account, and the throwaway per-link account is closed so its sponsored
 *  reserves return to the sponsor (also relieves the C2 reserve-leak risk).
 *
 *  This spike proves, on real testnet, that a 0-XLM per-link account can, in a
 *  SINGLE sponsor-fee-bumped transaction it sources itself:
 *    claimClaimableBalance  → payment(USDC → home) → changeTrust(0) → accountMerge(→ home)
 *  and that afterwards:
 *    (1) the home account holds ALL the money (no fragmentation, nothing lost),
 *    (2) the throwaway account is GONE (merged), and
 *    (3) the sponsor's reserve lock for it is RELEASED (net reserve returned).
 *  The sponsor never touches value — funds move only between the user's own
 *  accounts; the sponsor pays the fee and gets its reserves back.
 *
 *  RUN:  pnpm --filter @lumenia/sponsor exec tsx src/spike7-consolidate.ts
 *  NEEDS: internet (Horizon testnet + friendbot). Self-contained. Testnet only.
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
import { friendbot, submit } from "./lib/stellar.js";
import { createdBalanceIdFromResult } from "./lib/stellar.js";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK = Networks.TESTNET;
const server = new Horizon.Server(HORIZON_URL);
const RECLAIM = (7 * 24 * 60 * 60).toString();
const AMOUNT = "12";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "✔" : "✗"} ${name}${detail ? `  (${detail})` : ""}`);
  ok ? pass++ : fail++;
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
async function accountExists(pub: string): Promise<boolean> {
  try {
    await server.loadAccount(pub);
    return true;
  } catch {
    return false;
  }
}

/** The sponsored 0-XLM onboarding sandwich (what /create-account builds). */
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

async function main() {
  console.log("============================================================");
  console.log(" SPIKE #7 — consolidate incoming money into ONE home account");
  console.log("============================================================\n");

  console.log("[0] bootstrap sponsor + issuer (friendbot)");
  const sponsor = Keypair.random();
  const issuer = Keypair.random();
  await Promise.all([friendbot(sponsor.publicKey()), friendbot(issuer.publicKey())]);
  const USDC = new Asset("USDC", issuer.publicKey());

  console.log("[1] the user's PERSISTENT home account (from their first claim; 0-XLM + USDC trustline)");
  const home = Keypair.random();
  await onboard(sponsor, home, USDC);

  console.log("[2] a SENDER (0-XLM) funded with USDC creates an incoming send-link CB → bearer");
  const sender = Keypair.random();
  const bearer = Keypair.random(); // the per-link throwaway key (lives in the link #fragment)
  await onboard(sponsor, sender, USDC);
  {
    const acc = await server.loadAccount(issuer.publicKey());
    const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.payment({ destination: sender.publicKey(), asset: USDC, amount: AMOUNT }))
      .setTimeout(180)
      .build();
    tx.sign(issuer);
    await submit(server, tx);
  }
  let balanceId: string;
  {
    const acc = await server.loadAccount(sender.publicKey());
    const claimants = [
      new Claimant(bearer.publicKey(), Claimant.predicateUnconditional()),
      new Claimant(sender.publicKey(), Claimant.predicateNot(Claimant.predicateBeforeRelativeTime(RECLAIM))),
    ];
    const inner = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: sender.publicKey(), source: sponsor.publicKey() }))
      .addOperation(Operation.createClaimableBalance({ asset: USDC, amount: AMOUNT, claimants, source: sender.publicKey() }))
      .addOperation(Operation.endSponsoringFutureReserves({ source: sender.publicKey() }))
      .setTimeout(180)
      .build();
    inner.sign(sender);
    inner.sign(sponsor); // sponsor signs its begin op (Spike #5 shape)
    const fb = TransactionBuilder.buildFeeBumpTransaction(sponsor.publicKey(), String(1000), inner, NETWORK);
    fb.sign(sponsor);
    const { resultXdr } = await submit(server, fb);
    const opIndex = inner.operations.findIndex((o) => o.type === "createClaimableBalance");
    balanceId = createdBalanceIdFromResult(resultXdr!, opIndex)!;
  }
  console.log(`    incoming CB: ${balanceId.slice(0, 12)}…  ($${AMOUNT} to bearer)`);

  console.log("[3] the per-link throwaway account is created (the /create-account sandwich)");
  await onboard(sponsor, bearer, USDC);
  const sponsoringWithThrowaway = await numSponsoring(sponsor.publicKey());
  const homeBefore = await usdc(home.publicKey(), USDC);

  console.log("\n[4] THE SWEEP — one bearer-sourced tx, sponsor-fee-bumped:");
  console.log("    claim → payment(→home) → changeTrust(0) → accountMerge(→home)");
  {
    const acc = await server.loadAccount(bearer.publicKey());
    const inner = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.claimClaimableBalance({ balanceId, source: bearer.publicKey() }))
      .addOperation(Operation.payment({ destination: home.publicKey(), asset: USDC, amount: AMOUNT, source: bearer.publicKey() }))
      .addOperation(Operation.changeTrust({ asset: USDC, limit: "0", source: bearer.publicKey() }))
      .addOperation(Operation.accountMerge({ destination: home.publicKey(), source: bearer.publicKey() }))
      .setTimeout(180)
      .build();
    inner.sign(bearer);
    const fb = TransactionBuilder.buildFeeBumpTransaction(sponsor.publicKey(), String(2000), inner, NETWORK);
    fb.sign(sponsor);
    const res = await submit(server, fb);
    check("sweep tx succeeded on-chain", typeof res.hash === "string", res.hash.slice(0, 12) + "…");
  }

  console.log("\n[5] verify: all money in ONE home account, throwaway gone, reserves released");
  const homeAfter = await usdc(home.publicKey(), USDC);
  const homeXlm = await xlm(home.publicKey());
  const throwawayGone = !(await accountExists(bearer.publicKey()));
  const sponsoringAfter = await numSponsoring(sponsor.publicKey());

  check(
    "home account received the full amount (nothing lost, nothing fragmented)",
    Number(homeAfter) === Number(homeBefore) + Number(AMOUNT),
    `${homeBefore} → ${homeAfter} USDC`,
  );
  check("home still holds 0 XLM (recipient pays no gas)", homeXlm === "0.0000000", `${homeXlm} XLM`);
  check("the per-link throwaway account is GONE (merged away)", throwawayGone);
  check(
    "sponsor's reserve for the throwaway + claimed CB was RELEASED",
    sponsoringAfter < sponsoringWithThrowaway,
    `num_sponsoring ${sponsoringWithThrowaway} → ${sponsoringAfter}`,
  );

  console.log("\n[6] PRODUCTION shape: an ALREADY-CLAIMED throwaway (plain USDC, NO open CB) → 3-op sweep");
  console.log("    (the frozen /c/[id] route claims the CB at claim time, so consolidation has no claim op)");
  const throwaway2 = Keypair.random();
  await onboard(sponsor, throwaway2, USDC);
  {
    // issuer funds it directly = simulates "the claim already happened, money is plain USDC"
    const acc = await server.loadAccount(issuer.publicKey());
    const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.payment({ destination: throwaway2.publicKey(), asset: USDC, amount: "8" }))
      .setTimeout(180)
      .build();
    tx.sign(issuer);
    await submit(server, tx);
  }
  const homeBefore2 = await usdc(home.publicKey(), USDC);
  {
    const acc = await server.loadAccount(throwaway2.publicKey());
    const inner = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.payment({ destination: home.publicKey(), asset: USDC, amount: "8", source: throwaway2.publicKey() }))
      .addOperation(Operation.changeTrust({ asset: USDC, limit: "0", source: throwaway2.publicKey() }))
      .addOperation(Operation.accountMerge({ destination: home.publicKey(), source: throwaway2.publicKey() }))
      .setTimeout(180)
      .build();
    inner.sign(throwaway2);
    const fb = TransactionBuilder.buildFeeBumpTransaction(sponsor.publicKey(), String(2000), inner, NETWORK);
    fb.sign(sponsor);
    const res = await submit(server, fb);
    check("3-op already-claimed sweep succeeded on-chain", typeof res.hash === "string", res.hash.slice(0, 12) + "…");
  }
  const homeAfter2 = await usdc(home.publicKey(), USDC);
  const throwaway2Gone = !(await accountExists(throwaway2.publicKey()));
  check(
    "home received the already-claimed funds too (still ONE account, all money)",
    Number(homeAfter2) === Number(homeBefore2) + 8,
    `${homeBefore2} → ${homeAfter2} USDC`,
  );
  check("the already-claimed throwaway is GONE (merged)", throwaway2Gone);

  console.log("\n============================================================");
  console.log(fail === 0 ? ` ✅ SPIKE #7 PASS (${pass}/${pass + fail})` : ` ❌ SPIKE #7 FAIL (${fail} failed)`);
  console.log("============================================================");
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error("\n💥 spike7 failed:", (e as Error).message);
  process.exit(1);
});
