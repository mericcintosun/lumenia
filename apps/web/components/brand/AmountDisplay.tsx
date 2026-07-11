"use client";

/**
 * AmountDisplay — the money, always tabular-nums and the heaviest weight on screen
 * (FRONTEND_PLAN §5). Optional Motion count-up when the amount enters the viewport
 * or on mount. Honors prefers-reduced-motion (snaps to the value, no animation).
 *
 * NOT for the claim route: /c/[id] must stay Motion-free, so it uses its own
 * CSS-only count-up. This component is for /home, /send, /sent, landing.
 */
import { useEffect, useState } from "react";
import { animate } from "motion/react";
import { formatUsd } from "../../lib/money";
import { cn } from "@/lib/utils";

type AmountSize = "xl" | "lg" | "md";

const SIZE: Record<AmountSize, string> = {
  xl: "text-[3.5rem] leading-[1.05] tracking-[-0.02em]", // Amount-XL 56/64
  lg: "text-4xl leading-tight tracking-[-0.02em]",
  md: "text-2xl leading-tight tracking-[-0.01em]",
};

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AmountDisplay({
  value,
  size = "lg",
  countUp = false,
  className,
  tone = "money",
}: {
  value: string | number;
  size?: AmountSize;
  countUp?: boolean;
  className?: string;
  /** money = green (money arriving); ink = neutral (a balance at rest). */
  tone?: "money" | "ink";
}) {
  const target = typeof value === "string" ? Number.parseFloat(value) : value;
  const [display, setDisplay] = useState(countUp ? 0 : target);

  useEffect(() => {
    if (!countUp || prefersReducedMotion()) {
      setDisplay(target);
      return;
    }
    const controls = animate(0, target, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [target, countUp]);

  return (
    <span
      className={cn(
        "font-bold tabular-nums",
        tone === "money" ? "text-money" : "text-ink",
        SIZE[size],
        className,
      )}
    >
      {formatUsd(display)}
    </span>
  );
}
