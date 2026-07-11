"use client";

/**
 * /tools/usd-try — an indicative dollar↔lira estimate (FRONTEND_PLAN §1b), honestly
 * labeled "indicative". Not a quote; a display estimate from the same rate lib the
 * app uses.
 */
import { useState } from "react";
import { indicativeRate } from "../../../../lib/rate";
import { formatUsd, formatTry } from "../../../../lib/money";

export default function UsdTry() {
  const rate = indicativeRate();
  const [usd, setUsd] = useState("100");
  const n = Number.parseFloat(usd) || 0;

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">USD ↔ TRY</h1>
      <p className="mt-3 text-ink-soft">
        An <strong className="text-ink">indicative</strong> estimate of what dollars are worth in Turkish lira
        — a guide, not a quote.
      </p>

      <div className="mt-8 rounded-[20px] border border-line bg-surface p-6">
        <label className="text-sm text-ink-soft">
          Dollars
          <div className="mt-1 flex items-center rounded-[14px] border border-line bg-paper px-3">
            <span className="text-lg text-ink-soft">$</span>
            <input
              inputMode="decimal"
              value={usd}
              onChange={(e) => setUsd(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full bg-transparent px-2 py-3 text-lg text-ink outline-none"
            />
          </div>
        </label>
        <div className="mt-5 flex items-baseline justify-between">
          <span className="text-ink-soft">≈ in lira</span>
          <span className="text-2xl font-bold tabular-nums text-ink">{formatTry(n * rate)}</span>
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          Indicative rate: {formatUsd(1)} ≈ {formatTry(rate)}. Real rates move; this is for a rough idea only.
        </p>
      </div>
    </main>
  );
}
