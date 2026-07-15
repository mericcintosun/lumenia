/**
 * Moment — section 3, "the moment": the real human beat (brand.md §12.3). A treated photograph
 * (hands + a lavender-lit phone, no faces) with the copy in a soft glass panel over a periwinkle
 * scrim + slow Ken-Burns. Enriched with three "friction removed" chips (soft-3D check icon) that
 * stagger in — the human-relief payoff, now supported by brand-kit assets.
 */
"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

const EASE = [0.2, 0.7, 0.2, 1] as const;
const REMOVED = ["No form to fill", "No account to make", "No wait"];

export function Moment() {
  const ref = useRef<HTMLElement>(null);
  // Scroll-linked parallax: the glass copy panel drifts up as the section passes — a depth cue.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const copyY = useTransform(scrollYProgress, [0, 1], [70, -70]);

  return (
    <section className="moment" ref={ref}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="moment-img" loading="lazy" decoding="async"
        src="/brand-kit-assets/moment-hands.webp"
        alt="Two people at a sunlit table; one holds a phone glowing softly as money arrives"
      />
      <div className="moment-scrim" aria-hidden="true" />
      <motion.div
        className="moment-copy"
        style={{ y: copyY }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <p className="moment-eyebrow">The moment</p>
        <h2 className="moment-h">It&rsquo;s already theirs.</h2>
        <p className="moment-p">
          Someone you love taps the link — and the money is simply there, in their hands.
        </p>
        <div className="moment-chips">
          {REMOVED.map((r, i) => (
            <motion.span
              key={r}
              className="moment-chip"
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.45, delay: 0.25 + i * 0.1, ease: EASE }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand-kit-assets/icon-check.webp" loading="lazy" decoding="async" alt="" aria-hidden="true" />
              {r}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
