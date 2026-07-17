import type { BrowserContext } from "@playwright/test";

/**
 * Local-run helper. The web build BAKES the live sponsor origin, whose CORS allowlist pins the
 * deployed web origin — so a browser call from localhost is blocked. This installs a Playwright
 * route that re-issues every request to the baked origin against the target `SPONSOR_URL` and
 * fulfils with the real response.
 *
 * It is a URL REWRITE, not a stub: every byte still comes from the real sponsor code + real testnet.
 * No-op against the live URL (`SPONSOR_URL` unset or == the baked origin), so the same specs run
 * unchanged as the post-deploy live regression.
 */
const BAKED_SPONSOR = "https://lumenia-sponsor.vercel.app";

export async function rewriteSponsor(
  context: BrowserContext,
  target: string | undefined = process.env.SPONSOR_URL,
): Promise<void> {
  if (!target || target === BAKED_SPONSOR) return;
  await context.route(`${BAKED_SPONSOR}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const res = await fetch(`${target}${url.pathname}${url.search}`, {
      method: req.method(),
      headers: req.postData() ? { "content-type": "application/json" } : undefined,
      body: req.postData() ?? undefined,
    });
    await route.fulfill({
      status: res.status,
      body: await res.text(),
      contentType: res.headers.get("content-type") ?? "application/json",
    });
  });
}
