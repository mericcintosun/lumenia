/**
 * Indicative USD→TRY for DISPLAY ONLY — a clearly-labeled estimate, never a quote
 * and never fabricated ledger data. Surfaced as "indicative" in the UI. A live
 * quote service replaces this constant later (see /tools/usd-try). Moved here out
 * of the deleted lib/claims.ts fake-claim stub (no-mock-data rule).
 */
const INDICATIVE_USD_TRY = 38.0;

export function indicativeRate(): number {
  return INDICATIVE_USD_TRY;
}
