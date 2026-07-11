"use client";

/**
 * /demo — the product's best salesman is the claim page itself (FRONTEND_PLAN §1b).
 * One tap mints a REAL testnet claim link (sponsor /demo-link, faucet-funded, rate-
 * limited) and drops the visitor straight onto the claim screen to experience the
 * hero moment alone. Real on-chain data — no fiction.
 */
import { useState } from "react";
import { PhoneFrame } from "../../../components/marketing/PhoneFrame";

const SPONSOR_URL = process.env.NEXT_PUBLIC_SPONSOR_URL ?? "https://lumenia-sponsor.vercel.app";

export default function Demo() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function mint() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${SPONSOR_URL}/demo-link`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "demo unavailable right now");
      const d = (await res.json()) as { balanceId: string; bearerSecret: string; amount: string; issuer: string; from: string };
      const id = d.balanceId.slice(-8);
      const q = `a=${encodeURIComponent(d.amount)}&s=${encodeURIComponent(d.from)}&b=${d.balanceId}&i=${d.issuer}`;
      // full navigation so the #fragment (bearer key) is set on the claim page
      window.location.href = `/c/${id}?${q}#${d.bearerSecret}`;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-16 md:grid-cols-2">
      <div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          Experience receiving money
        </h1>
        <p className="mt-4 max-w-md text-ink-soft">
          Tap the button and we&apos;ll send <strong className="text-ink">you</strong> a real money link on
          the test network — the exact thing your recipient would tap. See the money, claim it in your
          browser, and check it on the public record. About 30 seconds.
        </p>
        <button
          onClick={mint}
          disabled={busy}
          className="mt-7 h-14 rounded-full bg-money px-8 text-base font-semibold text-primary-foreground transition-colors hover:bg-money/90 disabled:opacity-60"
        >
          {busy ? "Making your demo link…" : "Send myself a demo link"}
        </button>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <p className="mt-3 text-xs text-ink-soft">Test network — this money isn&apos;t real.</p>
      </div>
      <PhoneFrame />
    </main>
  );
}
