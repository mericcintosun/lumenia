"use client";

/**
 * /sent/[id] — the sender's confirmation + link status (FRONTEND_PLAN §1). Status
 * comes straight from the ledger (Horizon read on the claimable-balance id) — there
 * is no DB. "Copy link again" is served ONLY from the sender's own localStorage: the
 * server never saw the #fragment and must not pretend it can resend the link.
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadLinkStatus } from "../../../../lib/horizon";
import { formatUsd } from "../../../../lib/money";
import { StatusPill } from "../../../../components/brand/StatusPill";
import { MoneyCard } from "../../../../components/brand/MoneyCard";

interface SentRecord {
  balanceId: string;
  link: string;
  amount: string;
  from: string;
  at: string;
}

function loadSent(id: string): SentRecord | null {
  try {
    const all = JSON.parse(localStorage.getItem("lumenia.sent") ?? "{}") as Record<string, SentRecord>;
    return all[id] ?? null;
  } catch {
    return null;
  }
}

export default function SentPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [rec, setRec] = useState<SentRecord | null | undefined>(undefined);
  const [linkStatus, setLinkStatus] = useState<"pending" | "settled" | "loading">("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const r = loadSent(id);
    setRec(r);
    if (r) {
      void loadLinkStatus(r.balanceId)
        .then(setLinkStatus)
        .catch(() => setLinkStatus("pending"));
    }
  }, [id]);

  if (rec === undefined) return <p className="py-10 text-center text-ink-soft">Loading…</p>;

  if (!rec) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-bold text-ink">Link not found on this device</h1>
        <p className="mt-2 text-ink-soft">
          We only keep your links on the phone you sent them from — we never store them on a server.
        </p>
      </div>
    );
  }

  async function copyAgain() {
    try {
      await navigator.clipboard.writeText(rec!.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <header className="text-center">
        <p className="text-sm text-ink-soft">You sent</p>
        <p className="text-4xl font-bold tabular-nums text-ink">{formatUsd(rec.amount)}</p>
      </header>

      <div className="flex justify-center">
        {linkStatus === "loading" ? (
          <StatusPill status="waiting" label="Checking…" />
        ) : linkStatus === "pending" ? (
          <StatusPill status="waiting" />
        ) : (
          <StatusPill status="received" label="Received" />
        )}
      </div>

      {linkStatus === "pending" && (
        <MoneyCard className="p-5">
          <p className="text-sm text-ink-soft">
            Still waiting to be claimed. If nobody claims it, the money comes back to you 7 days after you sent
            it.
          </p>
          <button
            onClick={copyAgain}
            className="mt-3 h-11 w-full rounded-full border border-line text-sm font-medium text-ink"
          >
            {copied ? "Copied" : "Copy the link again"}
          </button>
        </MoneyCard>
      )}

      {linkStatus === "settled" && (
        <p className="text-center text-ink-soft">This money has been received. Nothing more to do.</p>
      )}
    </div>
  );
}
