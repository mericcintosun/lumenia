import type { Metadata } from "next";

export const metadata: Metadata = { title: "Roadmap — Lumenia" };

const SECTIONS: Array<{ title: string; tone: "done" | "building" | "next"; items: string[] }> = [
  {
    title: "Proven",
    tone: "done",
    items: [
      "Send money by a link; the recipient claims it walletless, with no app and no account.",
      "The recipient holds no network asset and pays nothing to receive — we cover the network cost.",
      "Send money onward with a link of your own.",
      "Every transfer is publicly verifiable; unclaimed links come back after 7 days.",
    ],
  },
  {
    title: "Building",
    tone: "building",
    items: [
      "Lock your money to you with a password (recovery on a new device).",
      "Ask someone to pay you with a link (request money).",
      "A smoother first-time experience on the cheapest phones.",
    ],
  },
  {
    title: "Next",
    tone: "next",
    items: [
      "Turning dollars into local currency through licensed partners.",
      "Spending directly with a card.",
      "Real funds, beyond the test network.",
    ],
  },
];

const DOT: Record<string, string> = {
  done: "bg-money",
  building: "bg-joy",
  next: "bg-ink-soft",
};

export default function Roadmap() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Roadmap</h1>
      <p className="mt-3 text-ink-soft">
        Honest about the line between what works today and what&apos;s still ahead.
      </p>
      <div className="mt-8 flex flex-col gap-8">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <div className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${DOT[s.tone]}`} />
              <h2 className="font-heading text-lg font-bold text-ink">{s.title}</h2>
            </div>
            <ul className="mt-3 flex flex-col gap-2 pl-5">
              {s.items.map((it) => (
                <li key={it} className="list-disc text-ink-soft">
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
