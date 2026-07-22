# Lumenia — Tech Stack & Project Document

> **In one sentence:** We turn Stellar's invisible infrastructure (anchors, USDC, sponsorship) into something an ordinary person can use by tapping a WhatsApp link — and every tap creates a newly funded Stellar account.

Target program: **SCF Build (Integration Track)** + **Instawards** (ambassador, 30-day MVP). Builder: Stellar Türkiye ambassador.

---

## 1. Project direction (what we're building, and why)

**The problem we solve:** In crypto, even *receiving* money first requires a wallet + seed phrase + gas — an absurd wall for a normal person. **Lumenia removes that wall:** someone holding nothing receives money via a link, in their pocket in ~30 seconds — no wallet, no seed, no gas. Settle in USDC, think in lira, nobody needs to know crypto.

**Hero flow (product-lens review correction):** **Link-send is the hero**; **request-money is the retention/differentiation layer** layered on top. Reason: link-send is the simplest, most viral first action (someone holding nothing receives money in ~30s), while request-money is crypto's universal weak spot = our differentiator and the loop that drives retention. The ritual: **splitting an uneven bill** (the thing Venmo does badly).

**Corridor (business-lens pivot):** **EU→TR inbound** (diaspora remittance; MyKobo EURC/SEPA = the only solid anchor) is the wedge; USDC circulation stays inside Turkey; CEX cash-out = a documented "safety valve," not the hero flow. Same community, opposite direction. Turkey's role shifted from "round-trip corridor" to "inbound endpoint + circulation pool."

**Off-ramp (next-milestone bet, NOT solved):** No Turkish CASP is confirmed to accept USDC on the *Stellar* network. The cash-out path is a **next-milestone infrastructure bet**: with **CCTP live on Stellar (~May 2026)**, bridge USDC to an accepted chain, or issue a **USDC card** (RedotPay/KAST). MASAK still imposes a ~$3k/day cap and a 72h first-withdrawal delay. We frame this honestly as the next milestone, not as a shipped feature.

**Moat = not technology:** (1) ambassador distribution (the Turkey corridor), (2) making "request money" first-class, (3) true walletless claim beyond LOBSTR's account-required model.

**Regulatory constraint (absolute):** the words **"yield / savings / interest / bank / trustless / auto-charge / Stellar-only"** appear NOWHERE in the product or the application. Those lines trigger legal exposure and overclaim.

---

## 2. Project risks (found in research, in order of importance)

| # | Risk | Status / Impact | Mitigation |
|---|---|---|---|
| **R1** | **Turkey off-ramp is BROKEN** | There is **no** live Stellar-native TRY anchor and **no** Turkish CASP confirmed to accept USDC over the *Stellar network* (they list it as ERC-20). MASAK: first withdrawal has a **72h delay**, $3k/day cap, ≥20-character memo → "instantly spendable" breaks. | **DEFER** the off-ramp in v1; frame as a **next-milestone infrastructure bet**. With **CCTP live on Stellar (~May 2026)**, bridge to an accepted chain, or issue a **USDC card** (RedotPay/KAST). Internal USDC circulation (1-cohort runway); pivot to EU→TR inbound. Official anchor directory (anchors.stellar.org) checked: TR anchors exist (Banxa, BiLira, …) but **Banxa rejects Stellar-USDC** and none offer a direct Stellar-USDC→TRY rail → engage Banxa/BiLira as BD leads. **Open #1 off-code task:** confirm a TR CASP / cash-out path — does any Turkish CASP accept Stellar-USDC? (Plan tracked in a local working doc.) |
| **R2** | **WhatsApp webview blocks passkeys** | Links arrive from WhatsApp → a passkey can't be created in the in-app webview. So the passkey is not a "fallback"; the **Argon2id password-wrap is the primary first-run path**, with PRF as an upgrade. | Design Argon2id as primary; make PRF an enhancement offered in a real browser. |
| **R3** | **Sponsor service = the single trusted choke-point** *(substantially mitigated)* | Every claim passes through a sponsor signature + fee-bump. **KMS half closed:** AWS KMS Ed25519 **raw-sign** is now available (since 2025-11-07; `ECC_NIST_EDWARDS25519` / `ED25519_SHA_512` / `MessageType=RAW`, raw 64-byte sig, DecoratedSignature hint = last 4 bytes of the pubkey) and **mechanically proven by Spike #1b**. **web→sponsor wire-parity + fee-bump proven by Spike #1c.** **Fee-abuse / rate-limit BUILT + live-proven** (per-IP + per-account, durable cross-instance via Upstash; a 12-request concurrent burst returned 5×200 + 7×429 against the deployed service). | Anti-drain validator hardened to **op SOURCE + PARAMETER level** with **44/44 tests** (`test-antidrain.ts`, strict-by-default) + **6/6 integration tests**, gating the live `/feebump`; if KMS were unverifiable, use Dfns/Turnkey.  The sponsor key can never spend principal. |
| **R4** | **Competitor: Sling Money** ($15M, FCA+MiCA, 145+ countries) | Same EM stablecoin-P2P thesis — but **on Solana, not Stellar**. | Not a killer: P2P corridors fragment corridor by corridor (M-Pesa took Kenya, not Nigeria). Entering as a global "Sling competitor" = a buzz-saw. Nail one corridor. Frame Sling as **validation**. |
| **R5** | **Regulation (MASAK/CASP)** | Non-custodial wallets are explicitly named within "wallet service provider" scope; non-custodial is not automatic exemption. | Strict non-custodial architecture (the ledger escrows). Leave the off-ramp to a licensed CEX; don't transfer TRY yourself. Engage a lawyer before mainnet. |
| **R6** | **"Why Stellar" is not a monopoly** | Peanut (EVM) + Daimo offer gasless walletless claim on other chains. | Don't say "only possible on Stellar." Say "zero custom-contract risk + zero setup for the recipient + native USDC + EM rails + Stellar's missing consumer primitive." |
| **R7** | **Serwist + Turbopack** is the newest, least-tested combo | Next 16 makes Turbopack the default; if the SW build breaks, the PWA milestone is blocked. | Day-1 spike with `@serwist/turbopack@9.5.11`. Fallback: `@serwist/next` + `--webpack`. Decide at M0. |
| **R8** | **PRF cross-device reality** | Behavior differs on iOS Safari 18.4+ and Android Chrome/GPM; in-app webview lockout. | Day-1 spike on real hardware. Argon2id is the mandatory floor; PRF must never be a dependency for the demo. |
| **R9** | **Turkey SMS is hostile** | P2P content is banned + (April 2026) non-resident senders can't send URL-bearing SMS to TR. | **WhatsApp Business API is primary**, not SMS. |
| **R10** | **Wallet SDK scope clarity** | The Wallet SDK does **not** provide passkey/smart-wallet or sponsored-claim logic (classic Ed25519). | Use the SDK for anchor/ramp + account/signing; build the claim core (`~30%`) yourself with `@stellar/stellar-sdk`. |
| **R11** | **"Net-new funded addresses" metric is sybil-gameable** | Onboarding is **free**, so the headline "net-new funded Stellar addresses" metric can be inflated with sybils. | Gate the headline metric on **unique-human + a retained second action** (don't count a raw funded address). Reserves are **reclaimable** (1.5 XLM, CAP-33), so the cost of a sybil is recoverable but the metric must not reward it. |

**Unmade-assumption traps ("mempool-class," caught before diving in):**
- A Claimable Balance alone doesn't solve accountless claim (the claimant needs a funded account + trustline) → sponsored-create is required.
- Stellar has no pull/debit → "request money" is a push the payer approves (shipped v1 uses a bearer / address Claimable Balance, **not** SEP-7 — SEP-7 deferred to v1.5).
- "Deterministic address" (SDP/Meridian) = the Soroban **smart-wallet** path, not a classic-keypair primitive → don't bring it into v1.

---

## 3. Tech Stack (ratified)

### 3.0 Repo topology — monorepo, two services
```
lumenia/  (pnpm workspaces)
├── apps/web/        → Next.js 16 PWA (PUBLIC, no secrets)
├── apps/sponsor/    → separate service, runs as a single Cloudflare Worker (HOT Ed25519 sponsor key)
└── packages/shared/ → tx-builder, claim-secret hash, types (web+sponsor must build byte-identical tx)
```
The sponsor backend is a **separate service** (not a Next API route): the hot signing key + anti-drain validation must live within their own network/IAM boundary and their own deploy cadence. It runs as a single **Cloudflare Worker** (`apps/sponsor/src/worker.ts`, `nodejs_compat`) — the Vercel esbuild-CJS path is a deprecated 12-function fallback (the move was forced by Vercel Hobby's 12-function cap once recovery pushed the count to 15).

### 3.1 Frontend (apps/web)
| Package | Version | What for |
|---|---|---|
| `next` | `16.2.9` (exact) | App Router, native manifest, `next/og` dynamic claim cards |
| `react` / `react-dom` | `19.x` (pinned by Next) | — |
| `typescript` | `^5.6` | — |
| `@serwist/turbopack` + `serwist` | `9.5.11` | Service worker (Turbopack default). **next-pwa is DEAD.** Fallback: `@serwist/next` + `--webpack` |
| `@stellar/stellar-sdk` | `16.0.0` (exact, NOT `^16` — don't jump to the `p27` preview) | rpc namespace, sponsored-reserve ops, `buildFeeBumpTransaction` |
| `@simplewebauthn/browser` | `13.3.0` | Passkey + PRF (low-level; `getClientExtensionResults().prf.results.first` by hand) |
| `@stellar/typescript-wallet-sdk` | `3.0.1` | SEP-24 (interactive) + SEP-10 (auth) + SEP-12 (KYC), + SEP-38 quotes; SEP-30 recovery — once an anchor is wired up; deferrable for v1 testnet. **SEP-6 interactive is deprecated → we commit to SEP-24.** |

- **Manifest:** Next native (`app/manifest.ts`); 192/512 + 512 maskable. On iOS, a manual "Add to Home Screen" hint.
- **OG cards:** `next/og`, a **per-claim-ID route** (`/c/[id]/opengraph-image`), **SSR**, pre-rendered/cached when the claim is created (the WhatsApp crawler misses a cold function). Each claim has a unique URL → WhatsApp's cache self-solves.

### 3.2 Identity & Recovery
> **Status (2026-07-22): SHIPPED in code** — password + email-OTP recovery + a WebAuthn-PRF "Face ID" upgrade (recovery crypto self-test 13/13; multi-account keystore + sweep also shipped). Real-device PRF (Spike #2) + Resend domain verification still gate real users.
- **v1 = classic Ed25519 keypair** (Soroban smart-account = v2; the v2 `LumenDrop` escrow is built + deployed to testnet).
- **Recovery:** WebAuthn **PRF** → `HKDF-SHA256` → `AES-256-GCM`, ciphertext **server-side** (cross-device passkey sync). The pattern is proven in Bitwarden.
- **Inversion:** Argon2id password-wrap = **primary** (WhatsApp webview), PRF = upgrade. Two server-wrapped copies of the same secret, one ciphertext-of-record.
- Support: Android Chrome/GPM is solid; iOS Safari **18.4+**. A fallback is mandatory.

### 3.3 Chain & custody model
- **Where USDC sits:** a **sender-funded Claimable Balance**, dual claimant predicate:
  - A = the recipient's claim-key (`unconditional`)
  - B = the sender (`not before T+expiry`, ~7 days → reclaim safety net)
  - → **The ledger escrows it, not the backend. Non-custodial.**
- **Claim sandwich** (sponsor signs + fee-bump): `beginSponsoring → createAccount(0 XLM) → changeTrust(USDC) → endSponsoring` + the recipient's `claimClaimableBalance`. The recipient has **0 XLM**, with USDC in their own account.
- **The secret in the link = a bearer claim-key** (NOT the recovery key), single-use.
- **Sponsor signing:** the live signer is an **env hot-key** (behind the `SponsorSigner` interface); AWS KMS Ed25519 **raw-sign** is proven mechanically (Spike #1b) and drops in behind the same interface later — not yet wired.
- **v1-claim / v2-send hybrid (2026-07-22):** the frozen `/c/[id]` claim stays classic CB (v1); the default shareable **link-send is now v2 Soroban `LumenDrop`** (late-bound payout, no per-recipient reserve), while classic direct-pay to an address stays v1.
- ❌ The deterministic-address pattern is not brought into v1 (smart-wallet = v2).

### 3.4 Backend — Sponsor service (apps/sponsor)
| Package | Version | What for |
|---|---|---|
| `@stellar/stellar-sdk` | `16.0.0` | build/validate/fee-bump tx |
| `@simplewebauthn/server` | `13.3.1` | Passkey ceremony + PRF salt |
| `@aws-sdk/client-kms` | `3.x` | **AWS KMS Ed25519 raw-sign — confirmed** (since 2025-11-07; `ECC_NIST_EDWARDS25519` / `ED25519_SHA_512` / `MessageType=RAW`, raw 64-byte sig). Alt: **Dfns** (native Stellar fee-sponsor) / **Turnkey** |
| `argon2` | `^0.41` | Argon2id password-fallback KDF |
| `@upstash/redis` (REST) | — | durable rate-limit, waitlist set, recovery ciphertext boxes, channel-account leases. **No Postgres is built** — everything else is on-chain (Horizon/Soroban) or on-device (IndexedDB) |
| `@upstash/ratelimit` | — | anti-drain |

- **Anti-drain (mandatory):** before the fee-bump, validate the inner tx at **op-source + parameter level** (not type-only) — every op's SOURCE plus the new `InnerTxPolicy` fields (`expectedAsset`, `expectedBalanceId`, `allowedPaymentDestinations`, `maxStartingBalance`): only the expected `createAccount(0)` + `changeTrust(USDC)` + a `claim` against a known CB; fee-source = sponsor. Stellar isolates the fee, **you prevent the reserve drain.** Hardened with **44/44 tests** (`test-antidrain.ts`, strict-by-default); wire-parity of the re-parsed tx proven (Spike #1c) and the gate runs on every live `/feebump`.
- The sponsor key is never a signer on a user account and can never spend principal.

### 3.5 Notification & sharing
- **Interim (shipped): email via Resend** for OTP + an in-app ~15s Horizon poll (owner-gated until getlumenia.com is verified in Resend). **WhatsApp Business API (Meta Cloud API) = planned primary in Turkey** (Q1-2027 long-lead; utility template free within the 24h window).
- **Web push** (Serwist + VAPID) → installed PWA (iOS: home-screen install required).
- ❌ Avoid SMS (Turkey P2P+URL restrictions).

### 3.6 Asset, network, off-ramp
- **Asset:** native Circle USDC on Stellar. **Network:** testnet → mainnet.
- **Off-ramp DEFERRED.** The architecture must not assume: synchronous cash-out, a live TRY anchor, CEX Stellar-USDC acceptance, or a fiat-denominated balance. The unit is **USDC** all the way down; TRY is only an indicative display.

---

## 4. Adversarial review notes (six lenses)

> **Note:** the notes below come from an **adversarial AI review method** — six independent lenses used to stress-test the project (there is no team behind these; each lens is a structured self-review).

### 🏛️ Architecture lens
> "**RATIFIED**, with two fixes + one reframe. USDC custody: a sender-funded Claimable Balance with a dual claimant predicate (recipient unconditional + sender reclaim-after-expiry); the sponsor pays only reserve+fee, never principal. **REJECT** the deterministic-address pattern for v1 — that's the smart-wallet path you've already deferred. Off-ramp: **DEFER**, internal circulation; the architecture must **not assume** synchronous cash-out / TRY anchor / fiat balance. The biggest risk: the sponsor service is the single trusted liveness/spend choke-point — on day 1, prove that KMS-Ed25519 can sign the sponsored sandwich AND that the anti-drain validator rejects a malicious inner tx."
>
> **Publishable trust-boundary sentence:** *"Lumenia is non-custodial — your USDC is escrowed on the Stellar ledger, not with us. Our servers pay the network reserve+fee (no XLM needed) and hold only an encrypted copy of your key that only you can unlock. We can never move your funds."*

### 🛠️ Engineering lens
> "Monorepo, two services. Pins: `@stellar/stellar-sdk@16.0.0` (exact), `next@16.2.9` + `@serwist/turbopack@9.5.11`, `@simplewebauthn/{browser,server}@13.3.x`. **Argon2id is the mandatory recovery floor, PRF an upgrade.** Burn day 1 on three spikes — if one blows up the architecture changes, so learn it before writing feature code. The sponsor backend must be a separate Node service because it holds a hot signing key — a Next API route is the wrong blast-radius. The 3 things most likely to eat time: PRF cross-device reality, Serwist+Turbopack, and sponsor-service correctness (KMS DecoratedSignature hint + anti-drain validation)."

### 📊 Business lens
> "The broken-off-ramp thesis isn't a killer, but it **demotes** Turkey from 'launch corridor' to 'seed community.' Internal circulation is ~1-cohort runway, *not a destination* — past the net-receiver threshold it's a roach motel. Pivot: **lead with EU→TR inbound** (MyKobo is solid), same community, opposite direction — the working leg (the sender) is also the paying/motivated leg. Sling won't kill you: P2P corridors fragment corridor by corridor; if you enter as a global Sling competitor you fall into the same Dollar-Wallet/MoneyGram trap. **The single-afternoon validation gates everything: does any Turkish CASP accept Stellar-network USDC?** The SCF pitch survives and *strengthens* — frame the cash-out gap honestly as a 'next-milestone infrastructure bet'; the 'we're activating new Stellar accounts' metric is independent of the off-ramp."

### 📋 Product lens
> "**Link-send hero; request-money the retention layer** (revised — link-send delivers first value fastest; request stays the differentiator since a broke user can initiate). Seed: one dense Turkish community, TRY→USDC, the **recurring uneven-split** ritual. Retention without yield: the **'chase what's owed to you' loop** (the strongest organic hook in P2P). The loop leaks most right after the claim → turn the payer into a requester. CUT from v1: request+uneven-splits, PRF, WhatsApp auto-notifications, fiat ramp, multi-asset, in-app social graph (the link travels via WhatsApp). North-star: **net-new funded recipients that take a retained second action** (sybil-aware); claim-to-second-action ≥25% is a retention hypothesis to measure later, not a v1 gate."

### 🎨 UX lens
> "**Web/PWA-first, app optional** — a claim is a link, its fate is the browser; a 'go to the App Store first' funnel kills it. Governing principle: **every crypto primitive stays backstage; the user is always front-stage and sees only two names: a person and an amount.** Biometric = account ('lock your money to you', not 'sign up'). The **trustline is buried inside a single 'we're moving your money' animation frame**, the sponsor pays the reserve, the user never sees it. Bill-split = a drag-to-rebalance game (the thing Venmo does badly). Wallet stack: passkey-clean for link-claim + web, but with a graceful fallback to classic-keypair + local-biometric."

### ✍️ Communications lens
> "Positioning: *'Send and request USDC by link — the recipient claims it with zero setup and pays no gas (the sponsor covers it), on Stellar.'* **AVOID:** trustless, only-on-Stellar, savings/yield/bank, auto-charge. Weaponize Sling/Peanut as *validation*, don't deny them: 'the mechanic is proven; the question is which chain's primitive does it cleanest — Stellar's escrow+sponsorship+passkey is the cleanest without a custom contract, and the volume that needs it is already on Stellar.' Metric: **net-new funded Stellar addresses created via claim** (not TVL — ecosystem activation)."

---

## 5. Day-1 spikes (NO feature code, don't start until these pass)

1. **Sponsor economics (R3) — ✅ DONE:** on testnet, sponsored 0-XLM create+trustline+fee-bump+claim returns **SUCCESS**; economics measured at **~$0.44 per onboarded recipient**, mostly reclaimable reserves (1.5 XLM, CAP-33). Sub-spikes now **PASS on testnet**: **Spike #1b** (KMS-style Ed25519 raw-sign of the sponsored sandwich) and **Spike #1c** (web→sponsor XDR wire-parity + fee-bump). The anti-drain validator **rejects malicious inner txs with 44/44 tests** (`test-antidrain.ts`), and the same gate is live on the deployed `/feebump`.
2. **PRF round-trip (R2/R8):** on real iOS Safari 18.4+ + Android Chrome, is keygen→PRF→encrypt→store→recover→signature accepted by the network?
3. **WhatsApp flow (R2/R9):** link → OG card render → claim in the WhatsApp webview → does the **Argon2id fallback trigger automatically**?

> ⚠️ **Still-open #1 off-code gate (R1, non-code, 1 afternoon):** does any Turkish CASP (BTCTurk/Paribu) accept USDC over the **Stellar network**? If not, fall back to **CCTP-bridge to an accepted chain** or a **USDC card** (RedotPay/KAST) for cash-out. **Everything branches off this — verify it first.**

---

## 6. Reference repos
- `stellar/wallet-backend` — Meridian Pay fee-sponsorship service (study for the sponsor pattern)
- `oceans404/stellar-sponsored-agent-account` — classic sponsored-reserve sandwich (the most direct reference for v1)
- `@simplewebauthn` examples — PRF + passkey
- `stellar/moneygram-access-wallet-mvp` — SEP-24 client reference (for the v2 off-ramp)

---
*Last updated: 2026-07-22 · Network: testnet-first · Regulation: no-yield, non-custodial*
