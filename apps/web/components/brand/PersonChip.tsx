/**
 * PersonChip — an initials avatar + first name (FRONTEND_PLAN component inventory).
 * The sender is the brand at the moment of claim; this is how a person is shown.
 * Server-safe (no client JS). The apricot ring is opt-in celebration only.
 */
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

const SIZE = {
  sm: { box: "size-8 text-xs", gap: "gap-2 text-sm" },
  md: { box: "size-10 text-sm", gap: "gap-2.5 text-base" },
  lg: { box: "size-14 text-lg", gap: "gap-3 text-lg" },
} as const;

export function PersonChip({
  name,
  size = "md",
  joyRing = false,
  nameless = false,
  className,
}: {
  name: string;
  size?: keyof typeof SIZE;
  /** apricot celebration ring — reserved for the moment money arrives. */
  joyRing?: boolean;
  /** show only the avatar (no name label). */
  nameless?: boolean;
  className?: string;
}) {
  const s = SIZE[size];
  const first = name.trim().split(/\s+/)[0] ?? name;
  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <span
        aria-hidden
        className={cn(
          "grid place-items-center rounded-full bg-secondary font-semibold text-ink",
          s.box,
          joyRing && "ring-2 ring-joy ring-offset-2 ring-offset-background",
        )}
      >
        {initials(name)}
      </span>
      {!nameless && <span className="font-medium text-ink">{first}</span>}
    </span>
  );
}
