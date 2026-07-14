/**
 * Moment — section 3, "the moment": the 3D world gives way to a real human beat (brand.md §12.3).
 * A treated photograph (hands + a lavender-lit phone in warm light, no faces) with the copy over
 * a periwinkle scrim + a slow Ken-Burns zoom — human relief, the payoff after the wall is gone.
 */
"use client";

import { motion } from "motion/react";

export function Moment() {
  return (
    <section className="moment">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="moment-img"
        src="/brand-kit-assets/moment-hands.webp"
        alt="Two people at a sunlit table; one holds a phone glowing softly as money arrives"
      />
      <div className="moment-scrim" aria-hidden="true" />
      <motion.div
        className="moment-copy"
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <p className="moment-eyebrow">The moment</p>
        <h2 className="moment-h">It&rsquo;s already theirs.</h2>
        <p className="moment-p">
          No form to fill. No account to make. No wait. Someone you love taps the link — and the
          money is simply there, in their hands.
        </p>
      </motion.div>
    </section>
  );
}
