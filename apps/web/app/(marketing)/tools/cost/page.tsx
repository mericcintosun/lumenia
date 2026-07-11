import type { Metadata } from "next";

export const metadata: Metadata = { title: "What it costs — Lumenia" };

const INCUMBENTS: Array<{ name: string; range: string; note: string }> = [
  { name: "Bank transfer (SEPA/SWIFT → Turkey)", range: "€6 – €15+", note: "plus an exchange spread, and often days to arrive" },
  { name: "Money-transfer apps", range: "€2 – €10", note: "cheaper and faster, but your recipient needs their app or a bank account" },
  { name: "Cash pickup services", range: "€5 – €20", note: "ubiquitous, but a branch visit and higher fees" },
];

export default function Cost() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
        What sending money home usually costs
      </h1>
      <p className="mt-3 text-ink-soft">
        Typical published ranges for sending money to Turkey. Millions of families already pay these every
        month — that&apos;s the market telling you the job matters.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {INCUMBENTS.map((r) => (
          <div key={r.name} className="rounded-[16px] border border-line bg-surface p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold text-ink">{r.name}</p>
              <p className="shrink-0 font-bold tabular-nums text-ink">{r.range}</p>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{r.note}</p>
          </div>
        ))}
        <div className="rounded-[16px] border border-money/30 bg-money/5 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold text-money">Lumenia (pilot)</p>
            <p className="shrink-0 font-bold text-money">Free</p>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Receiving is free — your recipient never pays to accept money, and we cover the small network cost.
            When we introduce a sending fee, it will be one number shown before you confirm.
          </p>
        </div>
      </div>
      <p className="mt-6 text-xs text-ink-soft">
        Ranges are typical published figures for illustration, not a live comparison. Lumenia is on a test
        network today.
      </p>
    </main>
  );
}
