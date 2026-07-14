/**
 * Fears — section 2, the four fears (brand.md §2), named then killed. Each first-person worry is
 * struck through in periwinkle on scroll (the subtraction motif), then the calm answer resolves.
 * Alternating editorial layout, not a card grid (brand.md §8).
 */
"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";

const FEARS = [
  {
    worry: "“I don’t even have a wallet — how would I receive it?”",
    lead: "You don’t need one.",
    rest: "Tap the link and the money is already there — no wallet, not now, not ever.",
  },
  {
    worry: "“What if I lose the twelve words?”",
    lead: "There are no twelve words.",
    rest: "You claim with your face or a password you choose. Nothing to write down, nothing to lose.",
  },
  {
    worry: "“I tap a link and money appears? That isn’t real.”",
    lead: "It’s real.",
    rest: "The money waits on a public ledger the moment the link is made — tapping it just hands it to you.",
  },
  {
    worry: "“What if it gets lost — is it safe?”",
    lead: "It sits in escrow only you can open",
    rest: "— or the sender, after seven days. Every transfer is publicly checkable, and we never hold it.",
  },
];

function FearBeat({ worry, lead, rest, i }: { worry: string; lead: string; rest: string; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.55 });
  return (
    <div ref={ref} className={`fear ${i % 2 ? "fear-r" : "fear-l"}${inView ? " in" : ""}`}>
      <p className="fear-worry">{worry}</p>
      <p className="fear-answer">
        <strong>{lead}</strong> {rest}
      </p>
    </div>
  );
}

export function Fears() {
  return (
    <section className="fears">
      <div className="fears-inner">
        <div className="fears-head">
          <motion.p
            className="fears-eyebrow"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.8 }}
          >
            <span className="fears-dot" />
            The part that scares people
          </motion.p>
          <motion.h2
            className="fears-title"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
          >
            Four walls. We take them down.
          </motion.h2>
        </div>
        <div className="fears-list">
          {FEARS.map((f, i) => (
            <FearBeat key={f.worry} {...f} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
