import { test, expect } from "@playwright/test";
import { mintClaimLink } from "./mintLink";

/**
 * The live-claim regression (Guardrail 2). Mints a fresh real claim link and
 * claims it end-to-end in a real browser against the deployed sponsor + web.
 * A green run here is the automated proof the grant-evidence flow still works
 * after a deploy. Assertions are intentionally tolerant of copy tweaks (regex),
 * strict on the mechanics (value-first paint + on-chain tx hash).
 */
const SPONSOR = process.env.SPONSOR_URL ?? "https://lumenia-sponsor.vercel.app";
const WEB = process.env.WEB_URL ?? "https://lumenia-chi.vercel.app";

test("fresh makelink → claim in a real browser → USDC lands (tx hash)", async ({ page }) => {
  const link = await mintClaimLink({ sponsor: SPONSOR, web: WEB, amount: "20", from: "Alvin" });
  test.info().annotations.push({ type: "claim-url", description: link.url });

  // 1. value-first: the money is painted before any action, no crypto words.
  await page.goto(link.url, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/sent you money/i)).toBeVisible();
  await expect(page.getByText("$20.00")).toBeVisible();

  // 2. claim — one decision, one button.
  await page.getByRole("button", { name: /claim my money/i }).click();

  // 3. success: the money landed + a real on-chain tx hash is surfaced.
  await expect(page.getByText(/in your account/i)).toBeVisible({ timeout: 120_000 });
  const hashLink = page.getByRole("link", { name: /^[a-f0-9]{64}$/i });
  await expect(hashLink).toBeVisible();
  const hash = (await hashLink.textContent())?.trim() ?? "";
  expect(hash).toMatch(/^[a-f0-9]{64}$/i);
  console.log(`\n✅ live claim OK — tx https://stellar.expert/explorer/testnet/tx/${hash}\n`);
});
