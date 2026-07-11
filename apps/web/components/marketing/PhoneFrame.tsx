"use client";

/**
 * PhoneFrame — the living hero phone (FRONTEND_PLAN §5b + §6: the mother's view IS
 * the hero image). A slow, looped claim: the money shows, the button presses
 * itself, success blooms with apricot confetti. No invented numbers beyond the demo
 * $20 — it mirrors the real claim screen. Motion-driven; the claim ROUTE stays
 * Motion-free (this is landing-only).
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const CONFETTI = [8, 20, 33, 46, 58, 70, 84];

export function PhoneFrame() {
  const [claimed, setClaimed] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const iv = setInterval(() => setClaimed((c) => !c), 3600);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="relative mx-auto w-[264px]">
      <div className="rounded-[40px] border border-line bg-surface p-3 shadow-[0_24px_60px_-24px_rgba(28,43,35,0.35)]">
        <div className="relative overflow-hidden rounded-[30px] bg-paper px-6 py-10">
          {/* sender */}
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-secondary text-lg font-bold text-ink ring-2 ring-joy ring-offset-2 ring-offset-paper">
              A
            </span>
            <p className="text-ink-soft">Alvin sent you money</p>
            <p className="text-[2.75rem] font-bold leading-none tabular-nums text-money">$20.00</p>
          </div>

          {/* action / success */}
          <div className="relative mt-8 flex h-14 items-center justify-center">
            <AnimatePresence mode="wait">
              {claimed ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: reduced ? 1 : 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="text-center"
                >
                  <p className="font-semibold text-money">Your money 🎉</p>
                  <p className="text-xs text-ink-soft">It&apos;s in your account.</p>
                </motion.div>
              ) : (
                <motion.div
                  key="cta"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, scale: reduced ? 1 : [1, 0.97, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ scale: { duration: 1.4, repeat: Infinity }, opacity: { duration: 0.3 } }}
                  className="h-12 w-full rounded-full bg-money"
                >
                  <span className="flex h-12 items-center justify-center text-sm font-semibold text-primary-foreground">
                    Claim my money
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* confetti on success */}
            <AnimatePresence>
              {claimed &&
                !reduced &&
                CONFETTI.map((left, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 1, y: -6 }}
                    animate={{ opacity: 0, y: 120 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, delay: i * 0.04, ease: "easeOut" }}
                    style={{ left: `${left}%` }}
                    className="pointer-events-none absolute top-0 size-2 rounded-[2px] bg-joy"
                  />
                ))}
            </AnimatePresence>
          </div>

          <p className="mt-6 text-center text-[11px] text-ink-soft">Delivered by Lumenia</p>
        </div>
      </div>
    </div>
  );
}
