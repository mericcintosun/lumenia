"use client";

/**
 * EmailCapture — the only PII we collect (notify-me email). Posts to the sponsor
 * /waitlist endpoint, which keeps it in an ISOLATED store, never joined to a pubkey
 * or any money data (FRONTEND_PLAN §1 / Architecture: "email + account balance in
 * one row is a dataset we don't want to be holding when it leaks").
 */
import { useState } from "react";

const SPONSOR_URL = process.env.NEXT_PUBLIC_SPONSOR_URL ?? "https://lumenia-sponsor.vercel.app";

export function EmailCapture({ list, cta }: { list: "waitlist" | "cashout"; cta: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${SPONSOR_URL}/waitlist`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ list, email }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Please try again.");
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="font-semibold text-money">Thanks — you&apos;re on the list. We&apos;ll be in touch.</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="w-full rounded-full border border-line bg-surface px-4 py-3 text-ink outline-none focus:border-money sm:max-w-xs"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-money px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-money/90 disabled:opacity-60"
      >
        {busy ? "…" : cta}
      </button>
      {error && <p className="text-sm text-danger sm:w-full">{error}</p>}
    </form>
  );
}
