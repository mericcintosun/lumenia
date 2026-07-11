"use client";

/**
 * Reveal — the landing's section-enter motion (FRONTEND_PLAN §5b): a 24px rise +
 * fade when it scrolls into view, once. Children can stagger via `delay`. Motion
 * collapses this to a plain fade under prefers-reduced-motion.
 */
import { motion, useReducedMotion } from "motion/react";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
