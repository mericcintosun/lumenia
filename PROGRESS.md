# PROGRESS — What Has Concretely Been Built So Far

This file records **only the work that has actually been done** (not plans or decisions — those live in [README.md](README.md) and [stack.md](stack.md)). The next agent reads this to see "what really exists."

Last updated: 2026-06-17 · Network: **testnet** · No real money used.

---

## 1. Documentation (written)

| File | What |
|---|---|
| [README.md](README.md) | Comprehensive project documentation (Turkish) — problem/solution/flows + 8 architecture decisions and **why**, tech stack, roadmap, risks, competitors. |
| [stack.md](stack.md) | Pinned tech stack + project risk table (R1–R10) + **6 persona rulings** (Tyler/Elliot/Justin/Nicole/Kaan/Bri, verbatim). |
| [AGENT_GUIDE.md](AGENT_GUIDE.md) | Grant context for the next agent + locked decisions + upcoming work. |
| Memory note | `~/.claude/projects/.../memory/claim-project.md` (+ MEMORY.md index) — persistent cross-session context. |

---

## 2. Monorepo skeleton (set up)

pnpm workspaces. `pnpm install` ran successfully (including the argon2 native build; Node 24, pnpm 9.12).

```
stelvin/
├── package.json                         # workspace root, scripts (web:dev, sponsor:dev, spike1)
├── pnpm-workspace.yaml                  # apps/* + packages/*
├── apps/
│   ├── web/
│   │   ├── package.json                 # @lumenia/web — Next 16.2.9, Serwist 9.5.11, stellar-sdk 16.0.0 (PINNED)
│   │   └── README.md                    # web responsibilities (no Next app files YET)
│   └── sponsor/
│       ├── package.json                 # @lumenia/sponsor — stellar-sdk, simplewebauthn/server, argon2 (CJS!)
│       ├── tsconfig.json
│       ├── README.md                    # spike + stellar-sdk@16/tsx CJS finding
│       └── src/
│           └── spike1-sponsored-claim.ts  # ✅ WORKING Spike #1 (below)
└── packages/
    └── shared/
        ├── package.json                 # @lumenia/shared
        └── src/index.ts                 # anti-drain validator + claim-secret + asset helpers + types
```

**Pinned versions (Elliot's ruling):** `@stellar/stellar-sdk@16.0.0` (exact), `next@16.2.9`, `react@19.2.0`, `serwist@9.5.11` + `@serwist/turbopack@9.5.11`, `@simplewebauthn/{browser@13.3.0,server@13.3.1}`, `@stellar/typescript-wallet-sdk@3.0.1`, `argon2@^0.41.1`, `tsx@^4.19`.

---

## 3. `packages/shared/src/index.ts` (written)

The primitives shared by web + sponsor:
- `usdc(issuer)` / `USDC_MAINNET_ISSUER` — asset helpers.
- `generateClaimSecret()` / `hashClaimSecret()` — link bearer token (only the hash is kept on the server).
- **`validateInnerTransaction(tx, policy)`** — anti-drain ALLOWLIST validator (the sponsor calls it before fee-bumping). Unknown op = REJECT; payment from the sponsor = REJECT (drain).
- Types: `ClaimLink`, `StellarNetwork`, `InnerTxPolicy`.

---

## 4. ✅ Spike #1 — Sponsored 0-XLM Claim (PASSING ON TESTNET)

**File:** [apps/sponsor/src/spike1-sponsored-claim.ts](apps/sponsor/src/spike1-sponsored-claim.ts)
**Run:** `pnpm spike1` (at the repo root) — real Horizon testnet + friendbot, no real money.

**What it proves (Lumenia's economic backbone + Tyler's biggest architectural risk):**

| Step | Result |
|---|---|
| 1. Fund issuer/sponsor/sender (EXCLUDING recipient) | ✔ |
| 2. sender USDC trustline + issuer issues 100 USDC | ✔ |
| 3. sender creates a dual-claimant Claimable Balance (recipient + sender-reclaim-7d) | ✔ |
| 4. **sponsored onboarding** → recipient with **0 XLM** + USDC trustline (reserve covered by sponsor) | ✔ |
| 5. recipient does a **fee-bumped claim** → received 20 USDC, **still 0 XLM** | ✔ |
| 6. anti-drain negative test → malicious inner tx **rejected** | ✔ |

**Last run output:** `✅ SPIKE #1 PASS` — the recipient onboarded with 0 XLM, claimed 20 USDC, still held 0 XLM after the claim, and anti-drain works. All ops happened on live testnet (every step returned a tx hash). Anti-drain rejection: `"payment sourced from sponsor (drain attempt)"`.

> **Meaning:** The sponsor pays ALL reserve + fees, so a new user can receive USDC with **zero XLM**. The "zero-setup, zero-XLM claim" promise and the sponsor-choke-point architecture were proven **on day 1, not just at the code stage.**

---

## 5. 🔎 Day-1 finding caught (mempool-class)

The `@stellar/stellar-sdk@16` ESM build blows up under `tsx`/Node ESM on its internal `@stellar/js-xdr` import:
`SyntaxError: ... does not provide an export named 'config'`.
**Fix:** Run the `apps/sponsor` package as **CommonJS** (removed `"type": "module"` from `package.json`) → stellar-sdk's solid CJS build loaded and the spike passed. Web (the Next.js bundler) is unaffected; only Node/tsx runs are. Keep the production sponsor service on CJS/bundle as well. (Note: in [apps/sponsor/README.md](apps/sponsor/README.md).)

---

## 6. NOT DONE YET (for the next agent)

- ❌ `apps/web` Next.js app files (manifest, claim page, OG route, Serwist SW) — only package.json + README exist.
- ❌ `apps/sponsor/src/index.ts` real HTTP service (`/create-account`, `/feebump`) — only the spike exists.
- ❌ **Spike #2** (WebAuthn PRF round-trip on a real device) — requires hardware, on the user side.
- ❌ **Spike #3** (WhatsApp webview claim + Argon2id fallback) — requires hardware.
- ❌ 🔑 **CASP verification:** Do BTCTurk/Paribu accept USDC on the Stellar network? (off-code, it gates the corridor — DO THIS FIRST.)
- ❌ Off-chain split ledger, request (SEP-7) flow, DB schema, recovery (PRF/Argon2id) implementation.

---

## 7. How to run (summary)

```bash
# at the repo root
pnpm install        # entire workspace; includes the argon2 native build
pnpm spike1         # Spike #1 → testnet → "✅ SPIKE #1 PASS"
```

> `node_modules/` is installed (gitignore recommended). Network is required (npm registry + Horizon testnet + friendbot).
