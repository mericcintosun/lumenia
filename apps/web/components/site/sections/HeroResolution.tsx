/**
 * HeroResolution — the hero's payoff: the subtraction settles into the promise + the real demo.
 * Rendered right after the scrub hero, still inside .op-over (z1) so it scrolls up over the
 * pinned greeting (the overlay-reveal transition). Copy is the comms-approved §6 headline.
 */
"use client";

import Link from "next/link";

export function HeroResolution() {
  return (
    <section className="op-after">
      <p className="op-after-eyebrow">Nothing to set up.</p>
      <h1 className="op-after-h">Money home, in a link.</h1>
      <p className="op-after-p">
        Send money by link. They tap it and it&rsquo;s theirs — no wallet, no seed phrase, no app.
        Held in dollars until they need it.
      </p>
      <div className="op-after-cta">
        <Link href="/demo" className="op-btn op-btn-primary">Try the live demo</Link>
        <Link href="/how-it-works" className="op-btn op-btn-ghost">See how it works →</Link>
      </div>
    </section>
  );
}
