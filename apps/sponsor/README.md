# @lumenia/sponsor

Lumenia's sponsor service: sponsored account creation + fee-bump (the recipient holds 0 XLM).
It holds a hot Ed25519 signing key (testnet scope; a KMS raw-signer drops in behind
`src/lib/signer.ts` later — mechanically proven by Spike #1b) and gates every fee-bump
with the anti-drain allowlist.

**Live (testnet):** a single Cloudflare Worker at https://lumenia-sponsor.avakit.workers.dev —
`GET /health` plus the POST endpoints below. Deploy = `cd apps/sponsor && npx wrangler deploy`.
(The old Vercel host + esbuild `api/*.js` bundle is a deprecated 12-function fallback.)
Evidence: [../../EVIDENCE.md](../../EVIDENCE.md).

## Layout

```
src/worker.ts       Cloudflare Worker entry (the LIVE host — all endpoints, node:http → fetch)
src/index.ts        node:http server (local dev + integration-test child)
src/lib/            config · signer · stellar · service · create-account · feebump · send · sweep ·
                    channels (concurrency lease) · soroban-relay (v2) · recovery-otp/-store ·
                    anti-drain (the D3 validator) · rate-limit (durable Upstash KV + in-memory fallback)
src/vercel/         function sources → esbuild-bundled deprecated 12-fn Vercel fallback
src/cli/            bootstrap · create-account · claim · makelink · provision-channels · reserve-report
src/test-antidrain.ts     44/44, no network
src/test-integration.ts   6/6 — happy claim / happy send / drain rejection / rate-limit (testnet)
src/spike*.ts             proof spikes (#1/#1b/#1c/#4/#5/#6/#7/#8/#9/#10 + LumenDrop v2)
```

Endpoints (Worker): `/health`, `/create-account`, `/feebump`, `/send-link`, `/sweep`, `/faucet`,
`/demo-link`, `/waitlist`, `/feedback`, `/events`, plus v2 Soroban `/v2-deposit` `/v2-claim`
`/v2-reclaim` and recovery `/recovery-otp` `/recovery` `/recovery-fetch` (the last four Worker-only).

## Run

```bash
pnpm install                                       # at the repo root
pnpm --filter @lumenia/sponsor test:antidrain      # 44/44, no network
pnpm --filter @lumenia/sponsor test:integration    # 6/6, testnet (friendbot)
pnpm --filter @lumenia/sponsor dev                 # local server (needs .env — see .env.example)
# deploy (live):     cd apps/sponsor && npx wrangler deploy          # Cloudflare Worker
# deploy (fallback): node build-vercel.mjs && vercel deploy --prod   # deprecated 12-fn Vercel
```

## ⚠️ stellar-sdk@16 module-system gotchas (hard-won)

- This package is **ESM** (`"type":"module"`, explicit `.js` extensions on relative
  imports); `tsx` runs everything fine. An earlier note said "run as CJS" — that is
  obsolete.
- The **live host is a single Cloudflare Worker** (`src/worker.ts`, `nodejs_compat`) — the
  sponsor is one service, and Vercel Hobby caps a deployment at 12 functions (recovery pushed
  it to 15). `@stellar/stellar-sdk@16` runs on `workerd`+`nodejs_compat` (proven).
- The **Vercel path is a deprecated fallback**: plain Node-ESM on Vercel breaks on the
  `@stellar/js-xdr` `config` export, so those functions are an **esbuild self-contained CJS
  bundle** (`build-vercel.mjs` → `api/*.js`). Don't deploy raw `.ts`/ESM function files there.
- Vercel uploads only this directory → no `workspace:*` imports in deployed code;
  the anti-drain validator lives here (`src/lib/anti-drain.ts`), not in
  `packages/shared`, so the tests and the deployed bundle share one module.
