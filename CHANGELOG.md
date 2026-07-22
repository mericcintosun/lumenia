# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

> **Testnet pilot.** Every release so far runs on the Stellar **test network**. No
> real money is used; balances are free-minted test USDC. Amounts and metrics reflect
> testing activity, not economic volume.

## [Unreleased]

- Community-health and presentation layer: contributing guide, code of conduct,
  security policy, issue/PR templates, and this changelog.

## [0.2.0] — 2026-07-22

Everything below remains on the Stellar **test network**. This release moves the
sponsor to a single always-on host, makes the default shareable link a Soroban
smart-contract escrow, and adds account recovery, concurrency, and take-it-back —
none of which touches the frozen classic claim path.

### Added

- **v2 Soroban `LumenDrop` escrow** — a smart-contract drop with a **late-bound
  payout**: the link key does not hold the money, it authorizes a payout to an
  address chosen at claim time (verified inside the contract). This is now the
  **default shareable link-send**; the relayer submits and pays the Soroban fee, so
  the flow stays walletless and the recipient still pays no gas. Deployed to testnet
  (single-drop + group-pool variants). The classic v1 Claimable Balance claim
  (`/c/[id]`) remains live and unchanged alongside it.
- **Account recovery** — password + email-OTP recovery of the on-device seed, plus a
  WebAuthn-PRF "Face ID" fast-unlock upgrade. One 32-byte seed is wrapped twice
  (Argon2id → AES-GCM as the floor; PRF → HKDF → AES-GCM as the upgrade) and stored
  as a ciphertext-only, zero-knowledge box the server cannot open. OTP-gated, on its
  own rate-limit bucket. (Owner-gated while the email domain is being verified.)
- **Channel-account concurrency** — a pool of sponsor-controlled channel accounts,
  each lending a transaction sequence under an exclusive Upstash Redis lease, removes
  the single-sequence bottleneck so concurrent claims no longer collide.
- **Recover / reclaim ("Take it back")** — a sender can reclaim an
  abandoned drop without paying gas (the sponsor fee-bumps) for both the classic (v1) and Soroban (v2) paths, surfaced as
  reclaimable notices in the app.

### Changed

- **Sponsor now runs as a single Cloudflare Worker**
  (`https://lumenia-sponsor.avakit.workers.dev`, deployed with `wrangler`), replacing
  the earlier multi-function serverless deployment. Same anti-drain gate, same
  env-hot-key signer, durable Upstash rate-limiting.
- **Anti-drain hardened to 44/44 unit tests** (from 25/25) — added a strict
  recovery-consolidation **sweep** policy, an exact op-**sequence** matcher, and a
  **golden-policy snapshot** test that fails if any allowlist ever widens. The claim
  allowlist was never widened. Integration suite stays 6/6.
- **Live product domain** — the web app now serves from **getlumenia.com**.

## [0.1.0] — 2026-07-18

The first end-to-end testnet pilot: send and request money by link, where the
recipient claims it walletless, seedless, and pays no gas.

### Added

- **Walletless claim flow.** A sender-funded Claimable Balance (dual predicate:
  recipient claims, or the sender reclaims after 7 days) is claimed by a recipient
  who holds **0 XLM** — the sponsor covers the account reserve and the transaction
  fee via a sponsored create + fee-bump. Proven end-to-end in a real browser on
  testnet.
- **Sponsor service** (`apps/sponsor`) with endpoints for account creation, claim
  fee-bumping, onward-send, a test-USDC faucet, demo links, an anonymous event
  beacon, a waitlist, and a feedback channel.
- **Anti-drain validator** — an allowlist that checks every operation's source and
  sensitive parameters before the sponsor signs, so a client transaction can never
  spend the sponsor's reserve or funds. Separate, tighter policies for the claim and
  send paths. Covered by 25/25 unit tests and 6/6 integration tests.
- **Durable rate limiting** (per-IP and per-account) across serverless instances,
  plus a per-bump fee cap.
- **Request money** — create a link that asks someone to pay you; the payer opens it
  and pushes the payment (no pull/debit), with honest handling for the with- and
  without-account cases.
- **Onward send** and an off-chain **split** helper.
- **Product web app** (`apps/web`) in the "Periwinkle" design system: landing,
  how-it-works, a live `/demo` that mints a real testnet claim link, a tools hub
  (transaction verify, link check, USD→TRY, cost), guides (`/learn`), `/stats` (real
  counts read from the public ledger), an honest `/cash-out` guide, and about /
  roadmap / privacy / terms / brand / developers pages.
- **On-device key handling** — a classic Ed25519 key generated on-device, stored in
  an IndexedDB keystore and optionally locked with an Argon2id-derived key.
- **Hermetic CI** — typecheck, the anti-drain validator, and production builds on
  every push and PR, with a single `ci-passed` gate and grouped Dependabot updates.

### Security

- The URL fragment carrying a bearer key is read only on the client and stripped from
  the address bar after use; it is never sent to a server.
- Money surfaces never expose wallet, crypto, or ledger-level error codes to users.

[Unreleased]: https://github.com/getlumenia/lumenia/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/getlumenia/lumenia/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/getlumenia/lumenia/releases/tag/v0.1.0
