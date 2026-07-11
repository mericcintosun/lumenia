/**
 * Landing — built LAST (the loop is closed). Sells the RECIPIENT's experience to
 * the sender ("will my mother manage this?"). ALL copy is verbatim from
 * FRONTEND_PLAN §6 (comms-approved). Motion per §5b (living phone, section reveals);
 * the hero phone mirrors the real claim screen — no invented numbers. Vocabulary law
 * holds (money + people only; the tech is named only on /how-it-works).
 */
import Link from "next/link";
import type { Metadata } from "next";
import { PhoneFrame } from "../../components/marketing/PhoneFrame";
import { Reveal } from "../../components/marketing/Reveal";
import { FaqItem } from "../../components/marketing/FaqItem";
import { MoneyCard } from "../../components/brand/MoneyCard";

export const metadata: Metadata = {
  title: "Lumenia — money home, in a link",
  description:
    "Send money to anyone in Turkey with a link. They tap it and it's theirs — no app to install, no account to set up, no fees taken from what you sent.",
};

const STEPS = [
  {
    n: "1",
    t: "You send a link.",
    b: "Choose an amount, get a link, share it on WhatsApp like you'd share anything else. That's the transfer.",
  },
  {
    n: "2",
    t: "They tap it.",
    b: "Your recipient sees the money immediately — before creating anything, before typing anything. Then they claim it with their face or a password. No app store, no forms, no branch.",
  },
  {
    n: "3",
    t: "It's theirs, in full.",
    b: "The exact amount arrives, held in dollars. Receiving is free — we cover the network cost. If nobody claims the link within 7 days, the money comes back to you.",
  },
];

const WHAT_THEY_SEE = [
  { t: "A message", b: "A link lands in WhatsApp, like anything else you'd share." },
  { t: "The money", b: "They tap it and see the amount — before creating anything." },
  { t: "It's theirs", b: "They claim it with their face or a password. Done." },
];

export default function Landing() {
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
        <Reveal>
          <h1 className="font-heading text-[2.75rem] font-extrabold leading-[1.05] tracking-tight text-ink md:text-6xl">
            Money home, in a link.
          </h1>
          <p className="mt-5 max-w-md text-lg text-ink-soft">
            Send money to anyone in Turkey with a link. They tap it and it&apos;s theirs — no app to install,
            no account to set up, no fees taken from what you sent. Held in dollars until they need it.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/demo"
              className="rounded-full bg-money px-7 py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-money/90"
            >
              Try the live demo
            </Link>
            <Link href="#how" className="px-3 py-3.5 text-base font-medium text-ink-soft hover:text-ink">
              See how it works ↓
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <PhoneFrame />
        </Reveal>
      </section>

      {/* What they see */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <Reveal>
            <h2 className="font-heading text-2xl font-bold text-ink">What they see</h2>
          </Reveal>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {WHAT_THEY_SEE.map((s, i) => (
              <Reveal key={s.t} delay={i * 0.08}>
                <MoneyCard interactive className="h-full">
                  <p className="text-sm font-semibold text-money">Step {i + 1}</p>
                  <p className="mt-1 font-semibold text-ink">{s.t}</p>
                  <p className="mt-1 text-ink-soft">{s.b}</p>
                </MoneyCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-5 py-16">
        <Reveal>
          <h2 className="font-heading text-2xl font-bold text-ink md:text-3xl">How it works</h2>
        </Reveal>
        <div className="mt-8 flex flex-col gap-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-money/10 font-bold text-money">
                  {s.n}
                </span>
                <div>
                  <p className="font-semibold text-ink">{s.t}</p>
                  <p className="mt-1 max-w-2xl text-ink-soft">{s.b}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* The safety promise / trust */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <Reveal>
            <h2 className="font-heading text-2xl font-bold text-ink md:text-3xl">
              Where is my money, exactly?
            </h2>
            <p className="mt-4 text-ink-soft">Fair question. Here&apos;s the honest answer:</p>
            <div className="mt-6 flex flex-col gap-5 text-ink-soft">
              <p>
                <strong className="text-ink">Not with us.</strong> The moment you send, your money moves into
                escrow on a public ledger — a shared record that no single company controls, where every
                transfer can be independently verified. Lumenia never holds your money, so we can&apos;t lend
                it, invest it, or lose it. Our system only does two jobs: it sets up your recipient&apos;s
                account and it pays the network&apos;s operating costs so your recipient doesn&apos;t have to.
              </p>
              <p>
                <strong className="text-ink">Only two people can move it.</strong> Your recipient can claim
                it. And if they don&apos;t within 7 days, you can take it back. Nobody else — including us.
              </p>
              <p>
                <strong className="text-ink">Every claim is checkable.</strong> Each transfer produces a
                public record. We don&apos;t ask you to believe this page; you can verify it.
              </p>
              <p>
                <strong className="text-ink">What we are not:</strong> Lumenia is not a bank and doesn&apos;t
                want to be one. We don&apos;t take deposits, we don&apos;t pay interest, and your money is not
                sitting in an account with our name on it. We move money from you to someone you love, and
                then we get out of the way.
              </p>
            </div>
            <Link
              href="/how-it-works"
              className="mt-6 inline-block font-semibold text-money underline-offset-2 hover:underline"
            >
              See a real transfer, verified →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* For senders / recipients */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="grid gap-4 md:grid-cols-2">
          <Reveal>
            <MoneyCard className="h-full">
              <h3 className="font-heading text-lg font-bold text-ink">If you&apos;re sending</h3>
              <ul className="mt-3 flex flex-col gap-2 text-ink-soft">
                <li>Share money the way you share everything else: a link in a chat.</li>
                <li>You keep control — unclaimed money returns to you after 7 days.</li>
                <li>What you send is what arrives. No hidden spread, no surprise deductions.</li>
                <li>Works from any phone or computer with a browser.</li>
              </ul>
            </MoneyCard>
          </Reveal>
          <Reveal delay={0.08}>
            <MoneyCard className="h-full">
              <h3 className="font-heading text-lg font-bold text-ink">If you&apos;re receiving</h3>
              <ul className="mt-3 flex flex-col gap-2 text-ink-soft">
                <li>You see the money the moment you tap the link — before you&apos;re asked for anything.</li>
                <li>Claim it in your browser with your face or a password. Nothing to install, nothing to memorize.</li>
                <li>Receiving is free. The full amount is yours.</li>
                <li>Your money is held in dollars until you need it, and you can send it onward with a link of your own.</li>
              </ul>
            </MoneyCard>
          </Reveal>
        </div>
      </section>

      {/* Request-money teaser */}
      <section className="mx-auto max-w-3xl px-5 pb-4">
        <Reveal>
          <p className="text-center text-ink-soft">
            Soon: <span className="font-semibold text-ink">ask someone to pay you</span> with a link too —
            chase who owes you, gently. <span className="text-ink-soft/70">Coming soon.</span>
          </p>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-16">
        <Reveal>
          <h2 className="font-heading text-2xl font-bold text-ink md:text-3xl">Questions</h2>
        </Reveal>
        <div className="mt-6">
          <FaqItem q="What if I lose the link, or send it to the wrong chat?">
            Treat a money link like cash in an envelope: whoever holds it can claim it, so share it in a
            private message with the person it&apos;s for. If it goes wrong — wrong chat, lost phone —
            don&apos;t panic: if nobody has claimed it, the money automatically becomes reclaimable by you
            after 7 days. Once someone claims it, though, it&apos;s claimed — exactly like handing over cash.
          </FaqItem>
          <FaqItem q="Is this a bank?">
            No — and that&apos;s deliberate. Banks hold your money; we never do. When you send with Lumenia,
            the money sits in escrow on a public ledger until your recipient claims it. That means no deposit
            insurance, because there&apos;s no deposit — and no bank, because there&apos;s nothing we&apos;re
            holding. We&apos;re a way to move money, not a place to bank it.
          </FaqItem>
          <FaqItem q="What does it cost?">
            During the pilot: nothing. Receiving will always be free — your recipient never pays to accept
            money, and we cover the small network cost behind the scenes. When we introduce a sending fee, it
            will be a single number shown to you before you confirm, never deducted from what your recipient
            gets.
          </FaqItem>
          <FaqItem q="What does my recipient actually need?">
            A phone with a browser. That&apos;s the whole list. No app, no account beforehand, no ID upload to
            see the money. They tap the link, see the amount, and claim it with their face or a password they
            choose.
          </FaqItem>
          <FaqItem q={'The money is "held in dollars" — what does that mean?'}>
            It means the amount doesn&apos;t wobble with crypto markets or shrink in a volatile currency while
            it waits. Your recipient can hold it as dollars and send it onward whenever they like. It is not a
            savings product: it earns nothing, and we&apos;d be suspicious of anyone who told you otherwise.
          </FaqItem>
          <FaqItem q="Can my recipient turn it into lira in their bank account?">
            Not inside Lumenia yet — we&apos;re honest about that. Cash-out will be handled through licensed
            local partners, and we&apos;ll ship it when it&apos;s genuinely reliable, not before. Today,
            recipients can hold dollars and send money onward to others.
          </FaqItem>
          <FaqItem q="What happens if Lumenia disappears tomorrow?">
            Your money doesn&apos;t, because we never had it. It lives on a public ledger under your
            recipient&apos;s control (or yours, for unclaimed links). This is the single most important design
            decision we made, and it&apos;s the reason this FAQ answer can exist.
          </FaqItem>
          <FaqItem q="Is this real, or a demo?">
            Both, honestly. The technology is live and every claim in this page&apos;s trust section is backed
            by real, publicly verifiable transfers — currently on a test network with test money. We&apos;d
            rather show you a working pilot and say so plainly than launch quietly with your rent money.
            Waitlist below.
          </FaqItem>
        </div>
        <Reveal>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="rounded-full bg-money px-6 py-3 text-base font-semibold text-primary-foreground hover:bg-money/90"
            >
              Try the live demo
            </Link>
            <Link
              href="/waitlist"
              className="rounded-full border border-line px-6 py-3 text-base font-medium text-ink hover:bg-secondary"
            >
              Join the waitlist
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
