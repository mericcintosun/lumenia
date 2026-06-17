# CLAUDE.md — Lumenia project operating manual

> This file is auto-loaded every session. It's kept short — read the linked files for
> detail. Do NOT repeat the README or stack here; point to them instead.

## Read first (in this order)
1. [AGENT_GUIDE.md](AGENT_GUIDE.md) — grant context + locked decisions + what's next
2. [README.md](README.md) — problem/solution/flows + the 8 architecture decisions and **why**
3. [stack.md](stack.md) — pinned stack + R1–R10 risk table + 6 persona reviews
4. [PROGRESS.md](PROGRESS.md) — what's concretely been done; §6 is the honest proven/unverified line

## One-liner
Send/request USDC by link; the recipient claims it walletless, seedless, and **pays no gas**, in a target ~30s.
Every claim = a new funded Stellar account. Target: Instawards (30-day MVP) + SCF Build (Integration).

## How this project works (after the Stelvin "mempool" lesson)
- **Research first, then code.** Verify every "Stellar does X" assumption against the official docs.
  Mark anything unverified as `UNVERIFIED — test`.
- **Adversarial stress-test:** cross-test major decisions with the 6 personas (kill or improve).
- **Day-1 spike discipline:** prove risky assumptions with a working spike before writing feature code.
- **Honesty:** no overclaiming; state plainly what is sandboxed/deferred; keep PROGRESS §6 truthful.
- **Language policy:** all repo artifacts (docs, code comments, commits, identifiers) are in English; only direct conversation with the user is in Turkish.
- **No author-authority phrasing** (e.g. "signed off by N personas"). Personas are an adversarial **AI review method**, not a team.

## LOCKED decisions — technical, spike-backed (don't reopen without cause — README §4)
1. Web-first Next.js 16 PWA (not React Native — a claim is a link).
2. Classic Ed25519 (v1); Soroban smart-account/passkey-signer = v2. "Face ID" = biometric lock + WebAuthn-PRF/Argon2id encrypted recovery.
3. Custody = sender-funded Claimable Balance (two claimants: recipient + sender-reclaim-7d) + sponsor backend. Ledger escrow → non-custodial. (Proven: Spikes #1/#1b/#1c.)
4. Sponsor key behind an external raw-Ed25519 signer (AWS KMS Ed25519, live since 2025-11-07) — mechanically proven by Spike #1b.

## PROVISIONAL decisions — product/strategy, not yet validated (current bets, may change)
- Hero = **link-send** (fastest first-value); **request-money** is the differentiation/retention layer ("chase who owes you"). (Revised per PM review; was "request = hero".)
- Corridor = EU→TR inbound (MyKobo). Off-ramp is a **next-milestone infrastructure bet**, not solved — see below.
- North-star metric = **net-new funded recipients that take a retained second action** (raw address count alone is sybil-gameable). claim-to-second-action is a hypothesis to measure, not a v1 success gate.
- WhatsApp-first notifications (TR SMS is hostile to P2P + URLs).

## HARD constraints (never violate)
- ❌ NO "yield / savings / interest / bank / deposit / trustless / Stellar-only / auto-charge" framing.
- ✅ Strictly non-custodial — money is escrowed on the ledger. The sponsor key only creates/funds + pays fees, never sources value ops, and **is never a signer on a user account**.
- ✅ Say "the recipient pays no gas" (the sponsor covers it), not bare "gasless". Say "target ~30s", not "is 30s" (unmeasured).

## Off-ramp reality (R1 — researched)
No Turkish CASP is confirmed to accept USDC on the **Stellar** network today. Mitigation path: **CCTP is live on Stellar (~May 2026)** → bridge Stellar-USDC to a chain a TR CASP accepts, or a USDC-funded card (RedotPay/KAST). MASAK caps: ~$3k/day, 72h first withdrawal. **Still must be confirmed end-to-end before promising cash-out** — highest-leverage off-code task.

## WhatsApp webview reality (researched)
Passkeys CANNOT be created in WhatsApp's in-app webview. Architecture: **value-first** (show the money before any credential) + **escape-to-browser** (Android `intent://` reliable; iOS "Open in Safari" best-effort) + **Argon2id password fallback**. **iOS fallback (escape unreliable):** complete the claim *inside* the webview with Argon2id (escape-to-browser is optional, offered as a PRF upgrade later) so the recipient never gets stuck. Recovery: Argon2id-primary, PRF as a fast-unlock upgrade, one mental model — "your password is the master key; Face ID is a shortcut." Measure **median-time-to-see-money** (and iOS escape success rate), not the happy-path 30s.

## Persona & skill workflow (stellar-build — installed)
- 6 personas (adversarial AI review method): **Tyler** (architect) · **Elliot** (dev) · **Justin** (analyst) · **Nicole** (pm) · **Kaan** (ux) · **Bri** (writer). Invoke via "talk to X" or the matching Skill; `party-mode` for a roundtable.
- For party-mode to spawn **real subagents**, the repo MUST be a git repo with at least 1 commit → already initialized.
- Router: [stellar-build/skills/SKILL_ROUTER.md](stellar-build/skills/SKILL_ROUTER.md). Official Stellar dev skills: soroban, dapp, assets, data, agentic-payments, zk-proofs, standards.
- AI build guide (country rails): [stellar-ai-guide/](stellar-ai-guide/) — there is NO TR folder (only mx/br); add `tr/` from `countries/_template` if needed.

## Wallet SDK boundary (Decision 8 / R10 — don't get confused)
`@stellar/typescript-wallet-sdk` solves ~70%: anchor/on-off-ramp (SEP-6/24/10/12, MyKobo
EURC/SEPA), account/signing boilerplate, custody abstraction. **BUT it does NOT give you the
passkey/smart-wallet or sponsored-claim logic** (classic Ed25519). The moat is the other 30% — **the sponsored 0-XLM
create+changeTrust+fee-bump sandwich, the bearer claim-link + Claimable Balance dual-predicate,
and request-money (SEP-7 push)** — built by hand with `@stellar/stellar-sdk@16` (proven by Spikes #1/#1b/#1c).
No passkey signer → v2 (OZ Smart Accounts). On v1 testnet the wallet-sdk can be deferred.

## Technical gotchas
- `@stellar/stellar-sdk@16` ESM blows up with `tsx`/Node ESM (the `@stellar/js-xdr` `config` export) → `apps/sponsor` runs as **CJS** (no `"type":"module"` in `package.json`). The prod sponsor is CJS/bundle too. Web (Next bundler) is unaffected.
- **Sponsor signing:** AWS KMS Ed25519 raw-sign (`ECC_NIST_EDWARDS25519` / `ED25519_SHA_512` / `MessageType=RAW`) returns a raw 64-byte sig; build the `DecoratedSignature` with hint = last 4 bytes of the pubkey (Spike #1b). The sponsor holds only the public address, never a plaintext secret.
- **Anti-drain validator** (`packages/shared`) checks op SOURCE + PARAMETERS, not just op type: sponsor may only source begin/createAccount; `createAccount.startingBalance ≤ 0`; `changeTrust` asset must match + be recipient-sourced; `payment` rejected unless destination is allow-listed; `claim.balanceId` + `beginSponsoring.sponsoredId` must match. Tested in `test-antidrain.ts` (14/14).
- web + sponsor transactions cross the wire as XDR and must re-parse byte-identically → both import from `packages/shared` (Spike #1c proved parity + fee-bump of the re-parsed tx).
- Pinned versions are exact (`stellar-sdk@16.0.0`, `next@16.2.9`, etc. — PROGRESS §2).

## Run
```bash
pnpm install          # includes the argon2 native build
pnpm spike1           # sponsored 0-XLM claim economics  → testnet
pnpm test:antidrain   # anti-drain validator             → 14/14, no network
pnpm spike1b          # external raw Ed25519 → DecoratedSignature → testnet
pnpm spike1c          # web→sponsor XDR wire-parity + fee-bump     → testnet
```

## Repo notes
- `stellar-ai-guide/` and `stellar-build/` = external reference repos (their own `.git`) → gitignored, not embedded.
- `node_modules/` is gitignored. Network is required (npm + Horizon testnet + friendbot).
- Working dir is historically `faceid-wallet`; product = Lumenia, packages = `@lumenia/*`.
