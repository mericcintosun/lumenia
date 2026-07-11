"use client";

/**
 * /tools/link-check — paste a money link → is it still waiting, claimed, or
 * returned? CLIENT-SIDE ONLY, and it NEVER transmits the link's #fragment (the
 * bearer key = cash): we read only the public balance id from the query and check
 * the ledger. The page warns about this explicitly (FRONTEND_PLAN §1b).
 */
import { useState } from "react";
import { loadLinkStatus } from "../../../../lib/horizon";

export default function LinkCheck() {
  const [link, setLink] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "pending" | "settled" | "error">("idle");

  async function check(e: React.FormEvent) {
    e.preventDefault();
    let balanceId = "";
    try {
      const u = new URL(link.trim());
      balanceId = u.searchParams.get("b") ?? ""; // ONLY the public id — never the #fragment
    } catch {
      /* not a URL */
    }
    if (!/^[a-f0-9]{72}$/i.test(balanceId)) {
      setState("error");
      return;
    }
    setState("loading");
    try {
      setState(await loadLinkStatus(balanceId));
    } catch {
      setState("error");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
        Check a money link
      </h1>
      <p className="mt-3 text-ink-soft">
        Paste a money link to see whether it&apos;s still waiting, already claimed, or returned to the sender.
      </p>
      <div className="mt-4 rounded-[16px] border border-line bg-secondary/50 p-4 text-sm text-ink-soft">
        This check happens entirely in your browser. We only look at the public part of the link — the secret
        key part is never sent anywhere. Still, treat a money link like cash: keep it private.
      </div>
      <form onSubmit={check} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Paste a money link"
          className="w-full rounded-full border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-money"
        />
        <button className="rounded-full bg-money px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-money/90">
          Check
        </button>
      </form>

      <div className="mt-6">
        {state === "loading" && <p className="text-ink-soft">Checking…</p>}
        {state === "error" && <p className="text-danger">That doesn&apos;t look like a valid money link.</p>}
        {state === "pending" && (
          <p className="rounded-[16px] border border-line bg-surface p-4 text-ink">
            ⏳ Still waiting to be claimed. If nobody claims it, it comes back to the sender after 7 days.
          </p>
        )}
        {state === "settled" && (
          <p className="rounded-[16px] border border-line bg-surface p-4 text-ink">
            ✓ This link is done — the money has been claimed or returned to the sender.
          </p>
        )}
      </div>
    </main>
  );
}
