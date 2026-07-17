"use client";

import { useEffect, useState } from "react";
import { indicativeRate, getLiveRate } from "../../../../lib/rate";
import { formatUsd, formatTry } from "../../../../lib/money";

export function Converter() {
  // Starts on the labeled fallback constant, upgrades to the real ECB reference
  // rate when the fetch lands — and says which one it is showing (no-mock rule:
  // never imply freshness we don't have).
  const [rate, setRate] = useState(indicativeRate());
  const [live, setLive] = useState(false);
  const [usd, setUsd] = useState("100");
  const n = Number.parseFloat(usd) || 0;

  useEffect(() => {
    let alive = true;
    void getLiveRate().then((r) => {
      if (alive && r.live) {
        setRate(r.rate);
        setLive(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="tool-panel">
      <label className="tool-field-label">
        Dollars
        <div className="tool-field">
          <span className="tool-field-sym">$</span>
          <input
            inputMode="decimal"
            value={usd}
            onChange={(e) => setUsd(e.target.value.replace(/[^0-9.]/g, ""))}
            aria-label="Dollars"
          />
        </div>
      </label>
      <div className="tool-figure">
        <span className="tool-figure-label">≈ in lira</span>
        <span className="tool-figure-value">{formatTry(n * rate)}</span>
      </div>
      <p className="tool-fine">
        {live
          ? `Reference rate: ${formatUsd(1)} ≈ ${formatTry(rate)} (European Central Bank, updates each business day).`
          : `Indicative rate: ${formatUsd(1)} ≈ ${formatTry(rate)}.`}{" "}
        Real exchange rates move; this is for a rough idea only.
      </p>
    </div>
  );
}
