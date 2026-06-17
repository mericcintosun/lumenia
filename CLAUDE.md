# CLAUDE.md — Lumenia project operating manual

> This file is auto-loaded every session. It's kept short — read the linked files for
> detail. Do NOT repeat the README or stack here; point to them instead.

## Read first (in this order)
1. [AGENT_GUIDE.md](AGENT_GUIDE.md) — grant context + locked decisions + what's next
2. [README.md](README.md) — problem/solution/flows + the 8 architecture decisions and **why**
3. [stack.md](stack.md) — pinned stack + R1–R10 risk table + 6 persona rulings
4. [PROGRESS.md](PROGRESS.md) — what's concretely been done (what actually exists)

## One-liner
Send/request USDC by link; the recipient claims it walletless, seedless, and gasless in ~30s.
Every claim = a new funded Stellar account. Target: Instawards (30-day MVP) + SCF Build (Integration).

## How this project works (after the Stelvin "mempool" lesson)
- **Research first, then code.** Verify every "Stellar does X" assumption against the official docs.
  Mark anything unverified as `UNVERIFIED — test`.
- **Adversarial stress-test:** cross-test major decisions with the 6 personas (kill or improve).
- **Day-1 spike discipline:** prove risky assumptions with a working spike before writing feature code.
- **Honesty:** no overclaiming; state plainly what is sandboxed/deferred.
- **Language policy:** all repo artifacts (docs, code comments, commits, identifiers) are written in English; only direct conversation with the user is in Turkish.

## LOCKED decisions (don't reopen without cause — detail in README §4)
1. Web-first Next.js 16 PWA (not React Native — a claim is a link).
2. Classic Ed25519 (v1); Soroban smart-account/passkey-signer = v2. "Face ID" = biometric lock + WebAuthn-PRF/Argon2id encrypted recovery.
3. Custody = sender-funded Claimable Balance (two claimants: recipient + sender-reclaim-7d) + sponsor backend. Ledger escrow → non-custodial.
4. Hero = "request money"; retention = the "chase the debtor" loop.
5. Corridor = EU→TR inbound (MyKobo). Off-ramp DEFERRED (no live TRY anchor; MASAK 72h/$3k).
6. WhatsApp-first notifications (TR SMS is hostile to P2P + URLs).

## HARD constraints (never violate)
- ❌ NO "yield / savings / interest / bank / deposit / trustless / Stellar-only / auto-charge" framing.
- ✅ Strictly non-custodial — money is escrowed on the ledger. The sponsor key only creates/funds + pays fees, and **can never spend the principal**.
- ✅ Metric: **net-new funded recipient addresses** (not TVL).

## Persona & skill workflow (stellar-build — installed)
- 6 personas: **Tyler** (architect) · **Elliot** (dev) · **Justin** (analyst) · **Nicole** (pm) · **Kaan** (ux) · **Bri** (writer). Invoke via "talk to X" or the matching Skill.
- For party-mode to spawn **real subagents**, the repo MUST be a git repo with at least 1 commit → that's why git was initialized.
- Router: [stellar-build/skills/SKILL_ROUTER.md](stellar-build/skills/SKILL_ROUTER.md). Official Stellar dev skills: soroban, dapp, assets, data, agentic-payments, zk-proofs, standards.
- AI build guide (country rails): [stellar-ai-guide/](stellar-ai-guide/) — there is NO TR folder (only mx/br); add `tr/` from `countries/_template` if needed.

## Wallet SDK boundary (Decision 8 / R10 — don't get confused)
`@stellar/typescript-wallet-sdk` solves ~70%: anchor/on-off-ramp (SEP-6/24/10/12, MyKobo
EURC/SEPA), account/signing boilerplate, custody abstraction. **BUT it does NOT give you the
passkey/smart-wallet or sponsored-claim logic** (classic Ed25519). The moat is the other 30% — **the sponsored 0-XLM
create+changeTrust+fee-bump sandwich, the bearer claim-link + Claimable Balance dual-predicate,
and request-money (SEP-7 push)** — built by hand with `@stellar/stellar-sdk@16` (proven by Spike #1).
No passkey signer → v2 (OZ Smart Accounts). On v1 testnet the wallet-sdk can be deferred.

## Technical gotchas
- `@stellar/stellar-sdk@16` ESM blows up with `tsx`/Node ESM (the `@stellar/js-xdr` `config` export) → `apps/sponsor` runs as **CJS** (no `"type":"module"` in `package.json`). The prod sponsor is CJS/bundle too. Web (Next bundler) is unaffected.
- web + sponsor transactions must be **byte-for-byte identical** → both must import from `packages/shared` (claim tx + anti-drain validator).
- Pinned versions are exact (`stellar-sdk@16.0.0`, `next@16.2.9`, etc. — PROGRESS §2).

## Run
```bash
pnpm install        # includes the argon2 native build
pnpm spike1         # Spike #1 → testnet → "✅ SPIKE #1 PASS"
```

## Repo notes
- `stellar-ai-guide/` and `stellar-build/` = external reference repos (they have their own `.git`) → they're in `.gitignore` and are not embedded in the Lumenia repo.
- `node_modules/` is gitignored. Network is required (npm + Horizon testnet + friendbot).
