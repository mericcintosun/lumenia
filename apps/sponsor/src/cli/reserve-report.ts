/**
 * reserve-report — quantify the sponsor's locked-reserve exposure (C2, Option A-i).
 *
 * A v1 send creates a sponsored Claimable Balance whose base reserve (0.5 XLM ×
 * claimant-count) is the SPONSOR's, locked until the CB is claimed (recipient) or
 * reclaimed (sender, after 7d). An abandoned link — never opened AND never reclaimed —
 * locks that reserve indefinitely; the sponsor CANNOT self-recover it (revokeSponsorship
 * is rejected on ClaimableBalanceEntry; a sponsor-claimant would take the sender's USDC =
 * non-custody violation). This makes the exposure a bounded, monitored liability rather
 * than a bug: this report is the live metric both the architecture + analyst reviews asked
 * for. Recovery is driven by nudging senders to reclaim (returns their money AND frees the
 * reserve); v2 (LumenDrop) removes the leak structurally.
 *
 *   RUN:  pnpm --filter @lumenia/sponsor reserve-report [-- --url <sponsor> | --sponsor G…]
 *   NEEDS: internet (Horizon testnet). Read-only, no keys, no writes.
 */
import { Horizon } from "@stellar/stellar-sdk";

const BASE_RESERVE_XLM = 0.5; // Stellar base reserve (per claimant on a CB)
const HORIZON = "https://horizon-testnet.stellar.org";
const server = new Horizon.Server(HORIZON);

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function resolveSponsor(): Promise<string> {
  const direct = arg("--sponsor");
  if (direct) return direct;
  const url = arg("--url") ?? "https://lumenia-sponsor.avakit.workers.dev";
  const res = await fetch(`${url.replace(/\/$/, "")}/health`);
  if (!res.ok) throw new Error(`/health ${res.status} at ${url}`);
  const health = (await res.json()) as { sponsorPublicKey?: string };
  if (!health.sponsorPublicKey) throw new Error("no sponsorPublicKey in /health");
  return health.sponsorPublicKey;
}

interface CbRow {
  claimants: number;
  asset: string;
  amount: string;
}

/** Page through every Claimable Balance whose reserve THIS account sponsors. */
async function loadSponsoredCbs(sponsor: string): Promise<CbRow[]> {
  const out: CbRow[] = [];
  let page = await server.claimableBalances().sponsor(sponsor).limit(200).order("asc").call();
  while (page.records.length > 0) {
    for (const r of page.records) {
      out.push({
        claimants: r.claimants.length,
        asset: r.asset,
        amount: r.amount,
      });
    }
    if (page.records.length < 200) break;
    page = await page.next();
  }
  return out;
}

async function sponsorXlm(sponsor: string): Promise<string> {
  try {
    const acc = await server.loadAccount(sponsor);
    return acc.balances.find((b) => b.asset_type === "native")?.balance ?? "0";
  } catch {
    return "unknown";
  }
}

async function main() {
  const sponsor = await resolveSponsor();
  console.log("============================================================");
  console.log(" RESERVE REPORT — sponsor locked-reserve exposure (C2)");
  console.log("============================================================");
  console.log(` sponsor: ${sponsor}`);

  const [cbs, xlm] = await Promise.all([loadSponsoredCbs(sponsor), sponsorXlm(sponsor)]);
  const totalClaimants = cbs.reduce((s, c) => s + c.claimants, 0);
  const lockedXlm = totalClaimants * BASE_RESERVE_XLM;

  // Break the locked reserve down by asset (which assets have money waiting).
  const byAsset = new Map<string, { count: number; claimants: number }>();
  for (const c of cbs) {
    const code = c.asset === "native" ? "XLM" : c.asset.split(":")[0]!;
    const e = byAsset.get(code) ?? { count: 0, claimants: 0 };
    e.count += 1;
    e.claimants += c.claimants;
    byAsset.set(code, e);
  }

  console.log(`\n open sponsored Claimable Balances : ${cbs.length}`);
  console.log(` total claimants across them        : ${totalClaimants}`);
  console.log(` LOCKED RESERVE (sponsor's XLM)      : ${lockedXlm.toFixed(4)} XLM  (= claimants × ${BASE_RESERVE_XLM})`);
  console.log(` sponsor free XLM balance           : ${xlm}`);
  if (byAsset.size) {
    console.log(`\n by asset:`);
    for (const [code, e] of byAsset) {
      console.log(`   ${code.padEnd(6)} ${e.count} CB(s), ${e.claimants} claimants → ${(e.claimants * BASE_RESERVE_XLM).toFixed(2)} XLM locked`);
    }
  }

  console.log("\n------------------------------------------------------------");
  if (cbs.length === 0) {
    console.log(" ✅ No locked reserve — no abandoned/outstanding sends to recover.");
  } else {
    console.log(` ⚠ ${lockedXlm.toFixed(2)} XLM is locked in outstanding sends. Recovery levers:`);
    console.log("   • recipient claims (money → recipient) or sender reclaims after 7d");
    console.log("     (money → sender AND reserve → sponsor). The sponsor cannot self-recover.");
    console.log("   • v2 (LumenDrop) sends hold no per-link reserve — structural fix.");
  }
  console.log(" This is a bounded, monitored liability, not a bug (see C2 analysis).");
}

main().catch((e) => {
  console.error("\n💥 reserve-report failed:", (e as Error).message);
  process.exit(1);
});
