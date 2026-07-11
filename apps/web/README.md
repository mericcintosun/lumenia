# @lumenia/web

Lumenia's web-first PWA (Next.js 16). A single codebase = a powerful web app + a mobile app installed via "Add to Home Screen".

**Live (testnet):** https://lumenia-chi.vercel.app — the value-first claim page is wired to
the live sponsor service (see [EVIDENCE.md](../../EVIDENCE.md)). For architecture and
decisions, see the root [README.md](../../README.md) and [stack.md](../../stack.md).

## What's here
- `app/page.tsx` — landing ("Send money, hold dollars.") · `app/manifest.ts` — PWA manifest
- `app/c/[id]/page.tsx` — **value-first claim page** (shows the money before any credential; public claim metadata in the query, bearer key in the `#fragment`, read client-side only) + `ClaimButton.tsx` (deferred-credential claim action → explorer tx link + the delegated cash-out placeholder)
- `app/c/[id]/opengraph-image.tsx` — **per-claim OG card** (`next/og`, SSR) so the WhatsApp preview already says "you got money"
- `lib/sponsor.ts` — the client claim flow (`runClaim`: `/create-account` → sign → `/feebump`)
- `lib/signer.ts` — **Signer abstraction** (v1 local-Ed25519 / v2 passkey, same interface — architecture-review condition #1)
- `lib/account.ts` — **address-stable** identity (signer swap, not account migration — architecture-review condition #2)
- `lib/offramp.ts` — **exit-adapter** interface (card / CCTP), outside the trust boundary, recipient-signed (architecture-review conditions #3/#4); surfaced in the UI as a disabled placeholder only (SOW scope)
- `lib/copy.ts` (English; a TR locale returns as an i18n pass), `lib/money.ts` ($/₺), `lib/claims.ts` (claim lookup stub)

Positioning rule enforced in copy: the user only ever sees **money ($/₺) and people** — never "wallet/crypto/USDC/Stellar/gas".

## Still stubbed (out of SOW scope)
- Recovery: passkey (WebAuthn PRF) + Argon2id — v2; the claim key currently comes from the link
- PWA service worker (Serwist), web push
- Request money (SEP-7) + uneven split UI — deferred to v1.5
- Off-ramp adapters behind the placeholder

## Run
```bash
pnpm install
pnpm --filter @lumenia/web dev
# deploy: cd apps/web && vercel deploy --prod --yes
```
