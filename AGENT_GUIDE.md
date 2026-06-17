# Guide for the Next AI Agent — Lumenia Project

This document brings you (the next agent) up to speed quickly: **grant context**, **project direction**, **locked decisions**, **constraints**, and **what's next**. Read this first, then [README.md](README.md) (decisions + rationale) and [stack.md](stack.md) (pinned stack + persona rulings), then [PROGRESS.md](PROGRESS.md) (what has concretely been built so far).

> **Who the user is:** A Stellar Turkey ambassador. They previously shipped **Stelvin** (a Soroban privacy batch-auction) — but its "MEV/mempool security layer" thesis turned out to be wrong (Stellar has no mempool). Because of that, they now want **thorough research + adversarial stress-testing before diving in**. Work the same way: verify an assumption before writing any code.

---

## 1. Goal: two grant programs

This project (**Lumenia**) is being built for two Stellar grants. The user shared the rules for both; the essence:

> **Note on the personas:** The personas (Tyler/Elliot/Justin/Nicole/Kaan/Bri) referenced throughout this guide are an **adversarial AI review method, not a team of people**.

### Instawards (first target — 30 days)
- **Open to ambassadors only.** The process starts with a referral from a local Ambassador Chapter + Chapter Lead.
- **$1,000–5,000 to start** (paid in XLM), **up to $15K total** (≤2 follow-ons, depending on past performance).
- **A 30-day, narrowly scoped, execution-focused sprint.** NOT a vague exploration or long roadmap.
- **A strong scope =** a concrete technical/product deliverable (prototype, integration, deploy, demo) + direct Stellar relevance + a clear success criterion + scope that matches the award amount.
- Approval in 3–5 business days. **KYC** required before disbursement (stellar.org/bd-kyc).
- → **Lumenia's v1 MVP fits this mold exactly:** a working "send by link + walletless claim" demo with testnet tx proofs.

### SCF Build (the big target — 3–6 months)
- **SCF 7.0**, 3 tracks: **Open** (new use-case), **Integration** (combine existing building blocks + bring real users), **RFP** (dev tooling).
- **Up to $150K** (lifetime, case-by-case $300K). 4 tranches: **10% → 20% → 30% → 40%** (last tranche requires mainnet + **UX readiness**).
- **The referral signal matters a lot** (22 of 29 winners in the last round got through with a referral).
- → **Lumenia fits the Integration Track:** it combines existing blocks (Claimable Balance, sponsorship, anchor/MyKobo, USDC) and brings users.

### Strategic read (from 2 people close to the Stellar team + research)
- **Retail/consumer products are front and center.** Security-layer products (like Stelvin) and simple task-reward systems are **no longer of interest.**
- SDF north-star: **"everyday financial services"**, stablecoin utility, RWA, agentic payments.
- **Open the SCF application with Stelvin credibility** ("I shipped a Soroban contract running on mainnet" = builder-proof). The metric to promise: **net-new funded Stellar addresses created via claims** (not TVL — ecosystem activation).

---

## 2. The project: Lumenia (one sentence)

> Send/request USDC by link; the recipient claims it walletless, seedless, and pays no gas, in a target ~30 seconds. Every claim = a new funded Stellar account.

Detailed problem/solution/flows: [README.md](README.md). The hero flow is **link-send** (fastest first value); **request-money** is the differentiation/retention layer on top. Corridor: **EU→TR inbound** (diaspora remittance).

---

## 3. LOCKED + PROVISIONAL decisions

Rationale is in [README.md §4](README.md) + [stack.md](stack.md).

### LOCKED (technical, spike-backed — don't reopen without cause)

1. **Web-first Next.js 16 PWA**, NOT React Native (a claim is a link → browser).
2. **Classic Ed25519 account (v1)**, NOT a Soroban smart-account/passkey-signer (that's v2). "Face ID" = biometric lock + WebAuthn-PRF/Argon2id encrypted recovery.
3. **Custody: sender-funded Claimable Balance** (two claimants: recipient + sender-reclaim-7d) **+ sponsor backend** (sponsored create + fee-bump → recipient pays 0 XLM). Ledger escrow → non-custodial.
4. **Sponsor key behind an external raw-Ed25519 signer (AWS KMS)** — proven in **Spike #1b** (raw Ed25519 sign → DecoratedSignature).

### PROVISIONAL (product/strategy bets — may change)

1. **Hero = link-send;** request-money = the retention layer (revised from the earlier "request = hero" bet).
2. **North-star = net-new funded recipients that take a retained second action** — raw count alone is sybil-gameable, so the metric is unique-human + retained second action.
3. **Corridor: EU→TR inbound** (MyKobo EURC/SEPA), with off-ramp framed as a **next-milestone bet** (no live TRY anchor in Turkey; MASAK 72h/$3k).
4. **WhatsApp-first notifications** (TR SMS is hostile to P2P+URLs).

---

## 4. HARD constraints (never violate)

- ❌ NO **"yield / savings / interest / bank / deposit"** framing — SCF legal rejects this (+ tokenized securities + prediction/betting).
- ✅ Strictly **non-custodial** — the ledger escrows the money, not us. The sponsor key only creates/funds + pays fees, and **can never spend principal**.
- ❌ Don't say **"trustless" / "only possible on Stellar"** — Peanut (EVM) + Sling (Solana) provide gasless walletless claims on other chains. Frame them as **validation**.
- ✅ Honest metric: **net-new funded recipient addresses.**

---

## 5. Current status + what's next

**Done** (details: [PROGRESS.md](PROGRESS.md)): monorepo skeleton, pinned package.json files, `packages/shared`, and three passing testnet spikes —
- **Spike #1** PASS: sponsored 0-XLM claim economics (sponsored create + trustline + fee-bumped claim).
- **Spike #1b** PASS: external raw Ed25519 → DecoratedSignature (the KMS signer path). AWS KMS has done Ed25519 raw-sign since 2025-11-07.
- **Spike #1c** PASS: web→sponsor XDR wire-parity + fee-bump.
- **Anti-drain validator hardened** with **14/14 tests**.

**Still open (in priority order):**
1. 🔑 **Confirm an end-to-end TR cash-out path** — the highest-leverage off-code task. No TR CASP is confirmed to accept USDC on Stellar; the mitigation is **CCTP on Stellar** (live ~May 2026) or a **USDC card**. (Note: the real competitor is the recipient's own bank app.)
2. **Spike #2** (real device): WebAuthn PRF round-trip on real hardware (keygen→encrypt→store→recover→sign). **Spike #3** (real device): WhatsApp webview claim + escape-to-browser + Argon2id fallback. Both **need devices**.
3. **`apps/web` skeleton:** manifest, claim page route, dynamic OG card route (`next/og`, SSR, per-claim-ID), Serwist SW.
4. **`apps/sponsor` HTTP service:** `/create-account` + `/feebump`, wiring the **KMS Ed25519 sign** + rate-limit.
5. Then the 30-day build order (M1→M5) from [stack.md] and [README.md §10].

---

## 6. How you should work (this project's method)

- **Research first, then code.** Verify any "Stellar does X" assumption against the official docs (the mempool lesson). Mark anything unverified as "UNVERIFIED — test".
- **Adversarial stress-test:** cross-test big decisions with the personas (Tyler/Elliot/Justin/Nicole/Kaan/Bri) — kill or improve.
- **Day-1 spike discipline:** prove a risky assumption with a working spike before writing feature code (see Spike #1).
- **Honesty:** no overclaiming; clearly state what is sandboxed/deferred.

---

## 7. Resources / file map

| File | Contents |
|---|---|
| [README.md](README.md) | Project documentation — decisions + **why** (Turkish) |
| [stack.md](stack.md) | Pinned tech stack + risk table + **6 persona rulings** |
| [PROGRESS.md](PROGRESS.md) | What code/work has concretely been done so far + how to run it |
| [apps/sponsor/README.md](apps/sponsor/README.md) | Spike #1 + stellar-sdk@16/tsx CJS finding |
| `~/.claude/.../memory/lumenia-project.md` | Persistent project memory (across sessions) |

**Original grant sources** (shared by the user in their first message, summarized in §1): Instawards Official Rules, SCF Handbook (https://stellar.gitbook.io/scf-handbook), Stellar Ambassador Welcome Handbook. To see SCF projects/rounds: communityfund.stellar.org.

**Stellar references:** Wallet SDK (https://stellar.org/products-and-tools/wallet-sdk), Claimable Balances + Sponsored Reserves docs (developers.stellar.org), `stellar/wallet-backend` (Meridian fee-sponsorship), `oceans404/stellar-sponsored-agent-account` (sponsored sandwich reference).

---

*Context: SCF Build (Integration) + Instawards · testnet-first · no-yield, non-custodial · Spike #1 testnet PASS.*
