/**
 * Offline correctness tests for the channel-lease manager (C1 fix, no network).
 *
 * The lease is what guarantees no two concurrent onboardings ever borrow the same
 * channel sequence. These tests pin the invariants the exclusive-lease design rests on:
 *   D  store atomicity        — acquire is a compare-and-set; a held key can't be re-taken
 *   E  store TTL expiry       — a lease auto-releases after its TTL (abandoned handouts)
 *   A  distinct under load     — N concurrent leases over N channels → N distinct, 0 dupes
 *   B  bounded by pool size    — N+K concurrent over N channels → exactly N leased, K null
 *   C  release → reuse         — releasing a channel returns it to the pool
 *   F  disabled when empty     — no CHANNEL_SECRETS ⇒ lease() returns null (fallback path)
 *
 * RUN: pnpm --filter @lumenia/sponsor test:channels   (offline, deterministic)
 */
import { Keypair } from "@stellar/stellar-sdk";
import { ChannelManager, memoryLeaseStore } from "./lib/channels.js";

let passed = 0;
let failed = 0;
function ok(label: string, cond: boolean, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ✔ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label} ${extra}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** N throwaway channel secrets — random keypairs, no funding needed for lease tests. */
function makeSecrets(n: number): string[] {
  return Array.from({ length: n }, () => Keypair.random().secret());
}

async function main() {
  console.log("============================================================");
  console.log(" CHANNEL-LEASE MANAGER — offline correctness");
  console.log("============================================================\n");

  /* --- D: store atomicity (compare-and-set) --- */
  console.log("[D] store atomicity — a held lease cannot be re-acquired");
  {
    const store = memoryLeaseStore();
    const first = await store.acquire("chan:X", 100);
    const second = await store.acquire("chan:X", 100);
    ok("first acquire wins", first === true);
    ok("second acquire on a held key fails", second === false);
    await store.release("chan:X");
    const third = await store.acquire("chan:X", 100);
    ok("after release, acquire wins again", third === true);
  }

  /* --- E: TTL expiry (abandoned handout self-heals) --- */
  console.log("\n[E] TTL expiry — a lease auto-releases after its TTL");
  {
    const store = memoryLeaseStore();
    ok("acquire with 1s TTL", (await store.acquire("chan:Y", 1)) === true);
    ok("still held before TTL", (await store.acquire("chan:Y", 1)) === false);
    await sleep(1150);
    ok("re-acquirable after TTL", (await store.acquire("chan:Y", 1)) === true);
  }

  /* --- A: N concurrent leases over N channels → all distinct --- */
  console.log("\n[A] N concurrent leases over N channels → N distinct, 0 duplicates");
  {
    const N = 20;
    const mgr = new ChannelManager(makeSecrets(N), memoryLeaseStore());
    const leases = await Promise.all(Array.from({ length: N }, () => mgr.lease({ attempts: 1 })));
    const got = leases.filter((l) => l !== null);
    const uniq = new Set(got.map((l) => l!.publicKey));
    ok(`all ${N} acquired a channel`, got.length === N, `(got ${got.length})`);
    ok("every lease is a DISTINCT channel (no double hand-out)", uniq.size === N, `(uniq ${uniq.size})`);
  }

  /* --- B: N+K concurrent over N channels → exactly N leased, K null --- */
  console.log("\n[B] over-subscription — 30 concurrent over 20 channels → 20 leased, 10 null");
  {
    const N = 20;
    const K = 10;
    const mgr = new ChannelManager(makeSecrets(N), memoryLeaseStore());
    const leases = await Promise.all(
      Array.from({ length: N + K }, () => mgr.lease({ attempts: 1 })),
    );
    const got = leases.filter((l) => l !== null);
    const nulls = leases.filter((l) => l === null);
    const uniq = new Set(got.map((l) => l!.publicKey));
    ok(`exactly ${N} leased`, got.length === N, `(got ${got.length})`);
    ok(`exactly ${K} fell back (null)`, nulls.length === K, `(got ${nulls.length})`);
    ok("no channel double-leased", uniq.size === got.length);
  }

  /* --- C: release → reuse --- */
  console.log("\n[C] release returns the channel to the pool");
  {
    const mgr = new ChannelManager(makeSecrets(2), memoryLeaseStore());
    const a = await mgr.lease({ attempts: 1 });
    const b = await mgr.lease({ attempts: 1 });
    const cNone = await mgr.lease({ attempts: 1 }); // pool of 2 exhausted
    ok("both channels leased", a !== null && b !== null);
    ok("third lease is null (pool exhausted)", cNone === null);
    await a!.release();
    const reused = await mgr.lease({ attempts: 1 });
    ok("after release, a channel is available again", reused !== null);
    ok("reused channel is the released one", reused!.publicKey === a!.publicKey);
  }

  /* --- F: disabled when no secrets --- */
  console.log("\n[F] disabled pool — no CHANNEL_SECRETS ⇒ lease() returns null (fallback)");
  {
    const mgr = new ChannelManager([], memoryLeaseStore());
    ok("enabled === false", mgr.enabled === false);
    ok("size === 0", mgr.size === 0);
    ok("lease() returns null", (await mgr.lease({ attempts: 1 })) === null);
  }

  console.log("\n============================================================");
  console.log(
    failed === 0
      ? ` ✅ CHANNEL-LEASE TESTS PASS (${passed}/${passed + failed})`
      : ` ❌ CHANNEL-LEASE TESTS FAIL (${failed} failed)`,
  );
  console.log("============================================================");
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("\n💥 channel-lease test crashed:", e);
  process.exit(1);
});
