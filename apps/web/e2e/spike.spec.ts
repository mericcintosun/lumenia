import { test, expect } from "@playwright/test";

/**
 * Desktop self-test of the key-lifecycle spike harness (Stage 3). Drives the full
 * cycle — keypair → friendbot fund → Argon2id encrypt → IndexedDB persist →
 * read-back + decrypt → sign a REAL testnet op → submit — and asserts PASS + a tx
 * hash. NOT part of the default regression; run explicitly against a flag-on dev
 * server: NEXT_PUBLIC_ENABLE_SPIKE=1 next dev, then `playwright test spike`.
 */
const SPIKE_URL = process.env.SPIKE_URL ?? "http://localhost:3000/spike/keys";

test("key-lifecycle: encrypt → persist → decrypt → sign real testnet op", async ({ page }) => {
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto(SPIKE_URL, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /key-lifecycle spike/i })).toBeVisible();

  await page.getByRole("button", { name: /run full spike/i }).click();
  await expect(page.getByText("✅ PASS", { exact: true })).toBeVisible({ timeout: 120_000 });

  const panel = await page.locator("dl").first().innerText();
  const txHref = await page.getByRole("link", { name: /^tx /i }).getAttribute("href");
  console.log("\n=== SPIKE RESULT (desktop) ===\n" + panel + "\n" + txHref + "\n");
  expect(txHref).toMatch(/\/tx\/[a-f0-9]{64}/i);
});
