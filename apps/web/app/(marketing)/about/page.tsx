import type { Metadata } from "next";

export const metadata: Metadata = { title: "About — Lumenia" };

export default function About() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
        Your money is never ours. That&apos;s the point.
      </h1>
      <div className="mt-6 flex flex-col gap-4 text-ink-soft">
        <p>
          Sending money to family shouldn&apos;t require the people you love to become tech people. Today the
          system taxes the sender&apos;s money and the recipient&apos;s dignity — app installs, ID selfies,
          queues. We think that&apos;s backwards.
        </p>
        <p>
          Lumenia is a simple idea taken seriously: send money with a link, and let the person receiving it do
          nothing but tap. No app, no account, no wallet, nothing to pay to receive. The money waits in escrow
          on a public ledger — never in our hands — so we can&apos;t lend it, lose it, or freeze it.
        </p>
        <p>
          We build in the open and say plainly what&apos;s proven and what isn&apos;t. Right now Lumenia is a
          pilot on a test network; turning dollars into local currency will come through licensed partners,
          when it&apos;s genuinely reliable.
        </p>
        <p>
          It&apos;s built by a small team in the Stellar Türkiye community, for the corridor we know: people in
          Europe sending money home.
        </p>
      </div>
    </main>
  );
}
