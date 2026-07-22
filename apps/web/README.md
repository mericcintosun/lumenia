# @lumenia/web

Lumenia's web-first PWA (Next.js 16, App Router). A single codebase = a web app + a mobile app
installed via "Add to Home Screen". For product architecture and decisions see the root
[README.md](../../README.md) and [stack.md](../../stack.md).

**Live (testnet):** https://getlumenia.com — the value-first claim page is wired to the live sponsor
service (a Cloudflare Worker, via `NEXT_PUBLIC_SPONSOR_URL`; see [EVIDENCE.md](../../EVIDENCE.md)).
**Deploy = push:** the Vercel Git integration builds `main` automatically; there is no manual
`vercel deploy` step in the normal flow.

## Route groups

The app is split into three worlds that never share chrome:

| Group | Routes | System |
|---|---|---|
| `(site)` | `/`, `/how-it-works`, `/demo`, `/learn` (+guides), `/about`, `/roadmap`, `/developers`, `/tools/*`, `/waitlist`, `/cash-out`, `/brand`, `/privacy`, `/terms`, `/claimed` | **Periwinkle**, indexed, self-hosted Sentient + Switzer, `next-themes` light/dark |
| `(app)` | `/home`, `/send`, `/sent/[id]`, `/request`, `/r/[id]`, `/account`, `/activity`, `/contacts`, `/notifications`, `/split`, `/unlock` | Periwinkle via the `.app-pw` token scope; real money surfaces; **all `noindex`** |
| root | `/c/[id]` · `/v2/c/[linkHex]` | `/c/[id]` = the **FROZEN** v1 classic claim (Instawards grant evidence; webfont-free + Motion-free, proven per-route; never restyle it). `/v2/c/[linkHex]` = the v2 Soroban LumenDrop claim — the default shareable link-send is now v2. |

Internal-only: `app/brand-kit/*` (design workspace) and `app/dev` are **404 in production** (a
`NODE_ENV` guard); `app/spike` is a key-lifecycle harness kept for a deferred device measurement.

## The claim route contract (`/c/[id]`)

```
/c/<last 8 of balanceId>?a=<amount>&s=<from>&b=<full balanceId>&i=<issuer>#<bearerSecret>
```

Public metadata rides in the query (SSR value-first paint); the **bearer key rides in the
`#fragment`** and never reaches a server. A per-claim OG card is a Node route handler at
`app/c/[id]/og/route.tsx` (not the file-convention image). The route carries `Referrer-Policy:
no-referrer` + `X-Robots-Tag: noindex` via `next.config.ts` headers.

## `lib/` — and which modules are mobile-portable

The `lib/` split is deliberate, with a future Expo app in mind. **Portable** = pure / RN-safe (would
move to a shared `packages/core` when a second consumer exists); **web-only** = assumes the browser.

| Module | Role | Portable? |
|---|---|---|
| `copy.ts` | all UI strings (English; vocabulary law) | ✅ pure |
| `money.ts` | `$`/`₺` formatting | ✅ pure |
| `rate.ts` | indicative USD→TRY (sync constant + `getLiveRate()` via our `/api/rate` proxy) | ✅ pure |
| `request.ts` | request-link build/parse | ✅ pure |
| `horizon.ts` | Horizon REST reads (balance/activity/claims) | ◐ fetch-based, web-shaped types |
| `sponsor.ts` / `send.ts` / `claim.ts` | tx build + sign + sponsor calls (`@stellar/stellar-sdk`) | ◐ browser-assumed |
| `wallet.tsx` | React context over the keystore | ✗ web (React web) |
| `keystore.ts` / `argon.ts` | IndexedDB + WASM Argon2id custody | ✗ web (browser crypto) |
| `signer.ts` | the signing boundary — **no seed leaves it** | ✗ web |
| `events.ts` | analytics beacon (hashed ids only) | ◐ |

**Why not `packages/core` yet:** `apps/web` deploys as a standalone Vercel upload, which cannot
resolve `workspace:*` deps (this is exactly why `packages/shared` sits orphaned). A shared package
would need a prebundle (committed dist + `file:`/copy) proven against a real Vercel build — worth
doing when the mobile app starts and there is a second consumer to validate against, not before.
Moving any module the frozen `/c/[id]` imports (`copy`, `money`, `rate`, `sponsor`, `keystore`,
`events`) also requires re-export shims so the frozen route's import paths stay byte-identical.

## CSS load order (who paints what)

There is no bundler magic here — order and scope are the whole system:

- **`app/globals.css`** — Tailwind v4 `@theme` + the `:root` **legacy** tokens the FROZEN `/c/[id]`
  still renders against. **Do not repurpose these globals**; the claim route depends on them.
- **`components/site/pw-tokens.css`** — the `--pw-*` Periwinkle palette on `.op` (landing) + `.pg`
  (every other `(site)` page). Token scope and page root are the **same class** on purpose (a page
  rooted at `.pg` without the palette silently renders unstyled — a real trap that cost hours).
- **`components/site/app-theme.css`** — the `.app-pw` scope. It **re-points the legacy token vars**
  (`--money`, `--ink`…) to Periwinkle **inside the `(app)` group only**, so the money components
  render on-brand without a rewrite AND the global `:root` stays untouched for the frozen route.
  This trick is load-bearing.
- **`page.css` / `editorial.css` / `tools.css`** — shared `(site)` layout, prose, tool primitives.
- **`landing.css` / `demo.css` / `how-it-works.css`** — co-located per-surface styles.
- **`fonts.css` / `theme-transition.css` / `sections/footer.css`** — faces, the View-Transitions
  theme wipe, and the footer (travels with `Footer.tsx`).
- **`components/feedback.css`** — the report-a-problem modal. Portaled to `document.body`, so it
  carries its **own** light/dark palette keyed on `data-theme` (it escapes the `.pg`/`.app-pw`
  scopes). `*.module.css` (Confetti, MoneyMovingAnimation) are component-scoped and self-contained.

## Run

```bash
pnpm install
pnpm --filter @lumenia/web dev            # http://localhost:3000
pnpm --filter @lumenia/web test:e2e       # live claim regression (needs USDC_ISSUER_SECRET)
```
