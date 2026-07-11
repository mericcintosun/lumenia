/**
 * ActivityRow — one money movement in plain human tense (FRONTEND_PLAN §1:
 * "activity list in human tense"). Money-green reserved for money arriving.
 * Real ledger data only.
 */
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatUsd } from "../../lib/money";
import { cn } from "@/lib/utils";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function ActivityRow({
  direction,
  usd,
  at,
}: {
  direction: "in" | "out";
  usd: string;
  at: string;
}) {
  const incoming = direction === "in";
  return (
    <div className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
      <span
        className={cn(
          "grid size-9 place-items-center rounded-full",
          incoming ? "bg-money/10 text-money" : "bg-secondary text-ink-soft",
        )}
      >
        {incoming ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
      </span>
      <div className="flex-1">
        <p className="font-medium text-ink">{incoming ? "Received" : "Sent"}</p>
        <p className="text-xs text-ink-soft">{relativeTime(at)}</p>
      </div>
      <p className={cn("font-semibold tabular-nums", incoming ? "text-money" : "text-ink")}>
        {incoming ? "+" : "−"}
        {formatUsd(usd)}
      </p>
    </div>
  );
}
