/**
 * StatusPill — a link/transfer's state in PLAIN WORDS (FRONTEND_PLAN component
 * inventory: waiting / received / returned — never crypto/ledger jargon).
 * Server-safe. Money-green is reserved for "received" (money arrived).
 */
import { cn } from "@/lib/utils";

type Status = "waiting" | "received" | "returned";

const STYLE: Record<Status, string> = {
  waiting: "bg-secondary text-ink-soft",
  received: "bg-money/10 text-money",
  returned: "bg-secondary text-ink",
};

const DEFAULT_LABEL: Record<Status, string> = {
  waiting: "Waiting to be claimed",
  received: "Received",
  returned: "Returned to you",
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: Status;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
        STYLE[status],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />
      {label ?? DEFAULT_LABEL[status]}
    </span>
  );
}
