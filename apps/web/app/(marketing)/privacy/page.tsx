import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy — Lumenia" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Privacy</h1>
      <p className="mt-3 text-ink-soft">Plain language. Here&apos;s exactly what we hold and what we don&apos;t.</p>

      <h2 className="mt-8 font-heading text-lg font-bold text-ink">What we never store</h2>
      <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-ink-soft">
        <li>Your money. It lives on a public ledger, never in a Lumenia account.</li>
        <li>Your password. It never leaves your phone; we couldn&apos;t read it if we wanted to.</li>
        <li>The keys to your money in a form we can open. See below.</li>
      </ul>

      <h2 className="mt-8 font-heading text-lg font-bold text-ink">What we may store</h2>
      <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-ink-soft">
        <li>
          If you choose to lock your money with a password, an <strong className="text-ink">encrypted
          backup</strong> of your key — scrambled with your password, which we don&apos;t have. To us it&apos;s
          meaningless noise; only your password unlocks it.
        </li>
        <li>
          If you join the waitlist or ask to be notified about cash-out, your <strong className="text-ink">
          email</strong> — kept on its own, never tied to your money or any account.
        </li>
        <li>Basic, non-identifying counts to see whether the product works (e.g. did a claim succeed).</li>
      </ul>

      <p className="mt-8 text-ink-soft">
        We don&apos;t sell your data, and we don&apos;t want to hold anything we don&apos;t need. This is a
        pilot; if any of this changes, we&apos;ll say so here plainly.
      </p>
    </main>
  );
}
