import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms — Lumenia" };

export default function Terms() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Terms</h1>
      <p className="mt-3 text-ink-soft">The short, honest version. A full legal document comes with launch.</p>

      <div className="mt-8 flex flex-col gap-4 text-ink-soft">
        <p>
          <strong className="text-ink">This is a pilot on a test network.</strong> The money here is test
          money with no real value. Don&apos;t send anything you can&apos;t afford to treat as a demo.
        </p>
        <p>
          <strong className="text-ink">We are not a bank or a money-transfer business.</strong> Lumenia
          doesn&apos;t hold your money — it moves between people on a public ledger. We provide the software
          that sets up accounts and covers network costs.
        </p>
        <p>
          <strong className="text-ink">A money link is like cash.</strong> Whoever holds the link can claim it.
          Keep it private and share it only with the person it&apos;s for. Once claimed, it&apos;s claimed.
        </p>
        <p>
          <strong className="text-ink">Your password is yours alone.</strong> If you lock your money with a
          password and forget it, nobody — including Lumenia — can recover it.
        </p>
        <p>
          <strong className="text-ink">No guarantees during the pilot.</strong> We build carefully and verify
          in public, but this is early software provided as-is while we test.
        </p>
      </div>
    </main>
  );
}
