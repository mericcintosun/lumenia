import type { Metadata } from "next";

export const metadata: Metadata = { title: "Developers — Lumenia" };

export default function Developers() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
        Payouts by link
      </h1>
      <div className="mt-6 flex flex-col gap-4 text-ink-soft">
        <p>
          Under the hood, Lumenia is a way to pay someone who has nothing set up yet: no wallet, no account, no
          address. We create the account, cover the network cost, and hand them the money — they just tap a
          link.
        </p>
        <p>
          That primitive is useful beyond consumer transfers. We&apos;re building toward a small API and SDK so
          any product can send a <strong className="text-ink">payout by link</strong> — refunds, earnings,
          rewards, gig payouts — to people who don&apos;t have a wallet, without asking them to make one.
        </p>
        <p>
          It&apos;s early and open. The code that powers the pilot — the sponsor service, the anti-drain
          validator, the claim flow — is public on GitHub. Real API docs will land alongside the API itself; we
          won&apos;t publish a docs site for something that doesn&apos;t exist yet.
        </p>
      </div>
      <a
        href="https://github.com/"
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-block rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink hover:bg-secondary"
      >
        View the code on GitHub ↗
      </a>
      <p className="mt-3 text-xs text-ink-soft">Docs coming with the API.</p>
    </main>
  );
}
