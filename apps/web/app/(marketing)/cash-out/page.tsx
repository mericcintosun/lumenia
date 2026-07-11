import type { Metadata } from "next";
import { EmailCapture } from "../../../components/marketing/EmailCapture";

export const metadata: Metadata = { title: "Turning it into lira — Lumenia" };

export default function CashOut() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
        Turning it into lira
      </h1>
      <div className="mt-5 flex flex-col gap-4 text-ink-soft">
        <p>
          Inside Lumenia you can hold your money in dollars and send it onward with a link. Turning it into
          Turkish lira in a bank account will be handled by <strong className="text-ink">licensed local
          partners</strong> — and we&apos;ll ship it when it&apos;s genuinely reliable, not before.
        </p>
        <p>We won&apos;t promise a date we can&apos;t keep. Want to know the moment it&apos;s ready?</p>
      </div>
      <div className="mt-6">
        <EmailCapture list="cashout" cta="Notify me" />
      </div>
    </main>
  );
}
