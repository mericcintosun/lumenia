# @lumenia/web

Lumenia's web-first PWA (Next.js 16). A single codebase = a powerful web app + a mobile app installed via "Add to Home Screen".

> Skeleton phase — the Next.js app files (`app/`, `manifest.ts`, service worker) have not been set up yet.
> For architecture and decisions, see the root-level [README.md](../../README.md) and [stack.md](../../stack.md).

## Responsibilities
- Claim link opening flow (in the browser, including the WhatsApp webview)
- Passkey (WebAuthn PRF) + Argon2id recovery — key encryption/decryption is client-side
- Building the inner tx (recipient signs) → sending it to the sponsor service
- Request money (SEP-7) + uneven split UI
- Dynamic OG cards (`next/og`, per-claim-ID, SSR)
- PWA (Serwist service worker, web push)

## Once built (draft)
```bash
pnpm --filter @lumenia/web dev
```
