# @lumenia/sponsor

Lumenia's sponsor service: sponsored account creation + fee-bump (the recipient holds 0 XLM).
It holds a hot Ed25519 signing key → separate service, KMS, anti-drain allowlist.

> Skeleton phase — the real HTTP service (`src/index.ts`) does not exist yet. For now there is only **Spike #1**.

## Spike #1 — Sponsored 0-XLM Claim (testnet)

Proves Lumenia's economic backbone: a new user gets an account + USDC trustline with **zero XLM**,
the sponsor pays the entire reserve+fee, the fee-bumped claim works, and anti-drain rejects a malicious tx.

```bash
pnpm install          # at the repo root
pnpm spike1           # or: pnpm --filter @lumenia/sponsor spike1
```

Output: 6 steps + `✅ SPIKE #1 PASS` + live testnet tx hashes. No real money.

## ⚠️ Day-1 finding: stellar-sdk@16 + tsx ESM interop

The `@stellar/stellar-sdk@16` ESM build blows up under `tsx`/Node ESM on the internal `@stellar/js-xdr`
import (`does not provide an export named 'config'`). **Solution:** run this package as
**CommonJS** (NO `"type": "module"` in package.json) → stellar-sdk's solid
CJS build is loaded. On the web side (the Next.js bundler) this issue does not occur; only Node/tsx execution
is affected. Keep the production sponsor service CJS (or bundled) as well.

## Responsibilities (once built)
- `/sponsor/create-account` — sponsored create + USDC trustline
- `/sponsor/feebump` — validate the inner tx against the **allowlist** (anti-drain) + fee-bump + submit
- Sponsor key: AWS KMS Ed25519 / Dfns / Turnkey (NOT a plaintext key in env)
- Rate-limit (per-account), poll `getTransaction` → SUCCESS
