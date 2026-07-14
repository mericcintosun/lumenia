/**
 * Trust — section 6, trust + FAQ. The comms-approved §6 copy, re-skinned to Periwinkle. Trust is
 * a narrative essay (not a card grid, brand.md §8); the FAQ is a native <details> accordion
 * (a candidate for the shadcn <Accordion> swap in the later shadcn-expansion pass).
 */
"use client";

import { motion } from "motion/react";

const TRUST_POINTS = [
  { lead: "Not with us.", body: "The moment you send, your money moves into escrow on a public ledger — a shared record no single company controls, where every transfer can be independently verified. Lumenia never holds your money, so we can’t lend it, invest it, or lose it. Our system only does two jobs: it sets up your recipient’s account, and it pays the network’s operating costs so your recipient doesn’t have to." },
  { lead: "Only two people can move it.", body: "Your recipient can claim it. And if they don’t within 7 days, you can take it back. Nobody else — including us." },
  { lead: "Every claim is checkable.", body: "Each transfer produces a public record. We don’t ask you to believe this page; you can verify it." },
  { lead: "What we are not.", body: "Lumenia is not a bank and doesn’t want to be one. We don’t take deposits, we don’t pay interest, and your money is not sitting in an account with our name on it. We move money from you to someone you love, and then we get out of the way." },
];

const FAQ = [
  { q: "What if I lose the link, or send it to the wrong chat?", a: "Treat a money link like cash in an envelope: whoever holds it can claim it, so share it in a private message with the person it’s for. If it goes wrong — wrong chat, lost phone — don’t panic: if nobody has claimed it, the money automatically becomes reclaimable by you after 7 days. Once someone claims it, though, it’s claimed — exactly like handing over cash." },
  { q: "Is this a bank?", a: "No — and that’s deliberate. Banks hold your money; we never do. When you send with Lumenia, the money sits in escrow on a public ledger until your recipient claims it. That means no deposit insurance, because there’s no deposit — and no bank, because there’s nothing we’re holding. We’re a way to move money, not a place to bank it." },
  { q: "What does it cost?", a: "During the pilot: nothing. Receiving will always be free — your recipient never pays to accept money, and we cover the small network cost behind the scenes. When we introduce a sending fee, it will be a single number shown to you before you confirm, never deducted from what your recipient gets." },
  { q: "What does my recipient actually need?", a: "A phone with a browser. That’s the whole list. No app, no account beforehand, no ID upload to see the money. They tap the link, see the amount, and claim it with their face or a password they choose." },
  { q: "The money is “held in dollars” — what does that mean?", a: "It means the amount doesn’t wobble with crypto markets or shrink in a volatile currency while it waits. Your recipient can hold it as dollars and send it onward whenever they like. It is not a savings product: it earns nothing, and we’d be suspicious of anyone who told you otherwise." },
  { q: "Can my recipient turn it into lira in their bank account?", a: "Not inside Lumenia yet — we’re honest about that. Cash-out will be handled through licensed local partners, and we’ll ship it when it’s genuinely reliable, not before. Today, recipients can hold dollars and send money onward to others." },
  { q: "What happens if Lumenia disappears tomorrow?", a: "Your money doesn’t, because we never had it. It lives on a public ledger under your recipient’s control (or yours, for unclaimed links). This is the single most important design decision we made, and it’s the reason this FAQ answer can exist." },
  { q: "Is this real, or a demo?", a: "Both, honestly. The technology is live and every claim in this page’s proof is backed by real, publicly verifiable transfers — currently on a test network with test money. We’d rather show you a working pilot and say so plainly than launch quietly with your rent money." },
];

export function Trust() {
  return (
    <section className="trust">
      <div className="trust-inner">
        <motion.div
          className="trust-essay"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <p className="trust-eyebrow"><span className="trust-dot" />The honest answer</p>
          <h2 className="trust-h">Where is my money, exactly?</h2>
          <p className="trust-intro">Fair question. Here’s the honest answer:</p>
          <div className="trust-points">
            {TRUST_POINTS.map((p) => (
              <p key={p.lead} className="trust-point">
                <strong>{p.lead}</strong> {p.body}
              </p>
            ))}
          </div>
        </motion.div>

        <div className="faq">
          <h2 className="faq-h">Questions</h2>
          <div className="faq-list">
            {FAQ.map((f) => (
              <details key={f.q} className="faq-item">
                <summary className="faq-q">
                  {f.q}
                  <span className="faq-mark" aria-hidden="true" />
                </summary>
                <p className="faq-a">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
