"use client";

/**
 * /tools/verify — the interactive proof of "every claim is checkable" (FRONTEND_PLAN
 * §1b). Paste a transfer code (tx hash) → plain-language rendering of the public
 * record + an explorer deep link. Real Horizon read.
 */
import { useState } from "react";
import { loadTransfer } from "../../../../lib/horizon";

const explorer = (h: string) => `https://stellar.expert/explorer/testnet/tx/${h}`;

export default function Verify() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "found" | "missing" | "error">("idle");
  const [result, setResult] = useState<{ successful: boolean; createdAt: string } | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    const hash = code.trim();
    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      setState("error");
      return;
    }
    setState("loading");
    try {
      const r = await loadTransfer(hash);
      if (!r) return setState("missing");
      setResult(r);
      setState("found");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
        Verify a transfer
      </h1>
      <p className="mt-3 text-ink-soft">
        Every transfer produces a public record you can check yourself. Paste a transfer code below.
      </p>
      <form onSubmit={check} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Transfer code"
          className="w-full rounded-full border border-line bg-surface px-4 py-3 font-mono text-sm text-ink outline-none focus:border-money"
        />
        <button className="rounded-full bg-money px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-money/90">
          Check
        </button>
      </form>

      <div className="mt-6">
        {state === "loading" && <p className="text-ink-soft">Checking the public record…</p>}
        {state === "error" && <p className="text-danger">That doesn&apos;t look like a valid transfer code.</p>}
        {state === "missing" && <p className="text-ink-soft">No transfer found with that code.</p>}
        {state === "found" && result && (
          <div className="rounded-[20px] border border-line bg-surface p-5">
            <p className="font-semibold text-money">
              {result.successful ? "✓ Real and confirmed" : "This transfer did not complete"}
            </p>
            <p className="mt-1 text-ink-soft">
              Recorded on {new Date(result.createdAt).toLocaleString()} on the public ledger.
            </p>
            <a
              href={explorer(code.trim())}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-money underline-offset-2 hover:underline"
            >
              See the full record ↗
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
