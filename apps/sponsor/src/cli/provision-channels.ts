/**
 * provision-channels — create + fund the channel-account pool (C1 fix).
 *
 * Generates N fresh keypairs, funds each on testnet (friendbot), verifies they exist,
 * and prints CHANNEL_SECRETS=<comma-separated> for the sponsor's env/secret. Each channel
 * is a sponsor-controlled account that LENDS its sequence number to one concurrent
 * onboarding so the sponsor's single sequence no longer serializes claims (see
 * lib/channels.ts). Channels pay only the tiny classic fee on the create-account path
 * (they hold plenty of friendbot XLM) and pay nothing on the fee-bumped v2-claim path.
 *
 *   RUN:   pnpm --filter @lumenia/sponsor provision-channels [-- --count 30]
 *   THEN:  npx wrangler secret put CHANNEL_SECRETS   (paste the printed value)
 *   NEEDS: internet (friendbot). Testnet only, no real money.
 */
import { Keypair, Horizon } from "@stellar/stellar-sdk";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");

function countArg(): number {
  const i = process.argv.indexOf("--count");
  const n = i >= 0 ? Number.parseInt(process.argv[i + 1] ?? "", 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 20;
}

async function friendbot(pub: string): Promise<void> {
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(pub)}`);
  if (!res.ok) throw new Error(`friendbot failed for ${pub}: ${res.status} ${await res.text()}`);
}

/** Bounded concurrency so a burst of friendbot calls doesn't get rate-limited. */
async function mapPooled<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!, i);
      }
    }),
  );
  return out;
}

async function main() {
  const count = countArg();
  console.log("============================================================");
  console.log(` provision-channels — creating ${count} channel accounts (testnet)`);
  console.log("============================================================\n");

  const channels = Array.from({ length: count }, () => Keypair.random());

  console.log(`[1] funding ${count} channels via friendbot (concurrency 5)…`);
  await mapPooled(channels, 5, async (kp, i) => {
    await friendbot(kp.publicKey());
    process.stdout.write(`   ✔ ${i + 1}/${count} ${kp.publicKey()}\n`);
  });

  console.log(`\n[2] verifying all ${count} exist on-ledger…`);
  const existed = await mapPooled(channels, 8, async (kp) => {
    try {
      await server.loadAccount(kp.publicKey());
      return true;
    } catch {
      return false;
    }
  });
  const ok = existed.filter(Boolean).length;
  console.log(`   ${ok}/${count} funded + confirmed`);
  if (ok !== count) {
    console.error("   ✗ some channels failed to fund — re-run before using this output");
    process.exit(1);
  }

  const value = channels.map((k) => k.secret()).join(",");
  console.log("\n============================================================");
  console.log(` ✅ ${count} channels provisioned`);
  console.log("============================================================");
  console.log("\nSet this as the sponsor's CHANNEL_SECRETS (enables the C1 channel pool):\n");
  console.log(`CHANNEL_SECRETS=${value}`);
  console.log("\nCloudflare Worker deploy:");
  console.log("  cd apps/sponsor");
  console.log(`  printf '%s' "${value}" | npx wrangler secret put CHANNEL_SECRETS`);
  console.log("  npx wrangler deploy");
  console.log("\n(Channels also need the KV store — KV_REST_API_URL/TOKEN — already set for");
  console.log(" the rate-limiter; the lease coordination reuses it. Without KV, leasing is");
  console.log(" in-memory-only and unsafe across Worker isolates.)");
}

main().catch((e) => {
  console.error("\n💥 provision-channels failed:", (e as Error).message);
  process.exit(1);
});
