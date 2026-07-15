/**
 * AvatarReveal — a reusable scroll-triggered entrance for the brand-kit mascots. The spring entrance
 * rides on the WRAPPER while the mascot img keeps its own CSS float on top, so the two transforms
 * never fight. Variants give each mascot a distinct, surprising arrival (rise / pop / drop).
 */
"use client";

import { motion, type Transition, type TargetAndTransition } from "motion/react";

type Variant = "rise" | "pop" | "drop";

const ENTRANCE: Record<Variant, { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition }> = {
  rise: {
    initial: { opacity: 0, y: 70, scale: 0.7 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: "spring", stiffness: 120, damping: 12, mass: 0.9 },
  },
  pop: {
    initial: { opacity: 0, scale: 0, rotate: -18 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    transition: { type: "spring", stiffness: 150, damping: 10 },
  },
  drop: {
    initial: { opacity: 0, y: -56, scale: 0.82 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: "spring", stiffness: 130, damping: 13 },
  },
};

export function AvatarReveal({
  src,
  variant = "rise",
  className,
  wrapClassName,
  glowClassName,
}: {
  src: string;
  variant?: Variant;
  className?: string;
  wrapClassName?: string;
  glowClassName?: string;
}) {
  const e = ENTRANCE[variant];
  return (
    <motion.div
      className={wrapClassName}
      initial={e.initial}
      whileInView={e.animate}
      viewport={{ once: true, amount: 0.5 }}
      transition={e.transition}
    >
      {glowClassName && <span className={glowClassName} aria-hidden="true" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} loading="lazy" decoding="async" className={className} alt="" aria-hidden="true" />
    </motion.div>
  );
}
