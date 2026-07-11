import type { Metadata } from "next";

export const metadata: Metadata = { title: "Brand — Lumenia" };

const COLORS: Array<{ name: string; value: string; use: string }> = [
  { name: "Paper", value: "#FAF6F0", use: "background" },
  { name: "Ink", value: "#1C2B23", use: "text" },
  { name: "Money green", value: "#1E7A52", use: "actions + money arriving" },
  { name: "Apricot", value: "#F4A259", use: "celebration only" },
  { name: "Danger", value: "#C4453C", use: "errors" },
];

export default function Brand() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Brand</h1>
      <p className="mt-3 text-ink-soft">A press kit and the basics for writing about us.</p>

      <h2 className="mt-10 font-heading text-lg font-bold text-ink">Name</h2>
      <p className="mt-2 text-ink-soft">
        It&apos;s <strong className="text-ink">Lumenia</strong> — one word, capital L. Not &quot;Luminia&quot;,
        not &quot;Lumeria&quot;.
      </p>

      <h2 className="mt-10 font-heading text-lg font-bold text-ink">Colors</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {COLORS.map((c) => (
          <div key={c.name} className="flex items-center gap-3 rounded-[16px] border border-line bg-surface p-3">
            <span className="size-10 shrink-0 rounded-lg border border-line" style={{ background: c.value }} />
            <div>
              <p className="font-semibold text-ink">
                {c.name} <span className="font-mono text-xs text-ink-soft">{c.value}</span>
              </p>
              <p className="text-sm text-ink-soft">{c.use}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-heading text-lg font-bold text-ink">Design</h2>
      <p className="mt-2 text-ink-soft">
        &quot;Warm paper, serious money.&quot; Not fintech navy, not crypto dark-neon — a handwritten note with
        cash inside. Amounts are the heaviest thing on screen; the sender is the hero at the moment of claim,
        and Lumenia stays backstage.
      </p>

      <h2 className="mt-10 font-heading text-lg font-bold text-ink">Boilerplate</h2>
      <p className="mt-2 rounded-[16px] border border-line bg-surface p-4 text-ink-soft">
        Lumenia lets you send money to anyone in Turkey with a link. The recipient taps it and it&apos;s theirs
        — no app, no account, no wallet, and nothing to pay to receive. The money waits in escrow on a public
        ledger, never in Lumenia&apos;s hands. Currently a pilot on a test network.
      </p>
    </main>
  );
}
