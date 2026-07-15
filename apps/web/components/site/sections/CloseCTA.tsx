/**
 * CloseCTA — section 7, the close CTA band over the bg-cta living video. Dual CTA (live demo +
 * waitlist) over a periwinkle scrim. Followed by the Footer below it in the page composition.
 */
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { AvatarReveal } from "./AvatarReveal";

export function CloseCTA() {
  return (
    <section className="close">
      <video className="close-bg" autoPlay loop muted playsInline preload="none" aria-hidden="true">
        <source src="/brand-kit-assets/video/bg-cta.webm" type="video/webm" />
        <source src="/brand-kit-assets/video/bg-cta.mp4" type="video/mp4" />
      </video>
      <div className="close-scrim" aria-hidden="true" />
      {/* Brand-kit messenger (var-celebrate, bg-removed) pops in cheering from the corner — a joyful
          nudge to try the demo. Bottom-fade grounds it; hidden on small screens. */}
      <AvatarReveal
        src="/brand-kit-assets/mascot-celebrate-cut.webp"
        variant="pop"
        wrapClassName="close-mascot-wrap"
        className="close-mascot"
      />
      <motion.div
        className="close-copy"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <h2 className="close-h">See it for yourself.</h2>
        <p className="close-p">
          The demo mints a real money link — no wallet, no signup, no gas. Or join the waitlist and
          we’ll tell you the moment it’s live for real.
        </p>
        <div className="close-cta">
          <Link href="/demo" className="op-btn op-btn-primary">Try the live demo</Link>
          <Link href="/waitlist" className="op-btn op-btn-ghost">Join the waitlist</Link>
        </div>
      </motion.div>
    </section>
  );
}
