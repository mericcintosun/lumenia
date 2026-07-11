/**
 * /claimed — a stateless explainer for the recipient wondering "what is this?"
 * after they've received money. No account data, no key access — cheap and static
 * (FRONTEND_PLAN §1). Vocabulary-law clean: money + people only.
 */
import type { Metadata } from "next";
import { TestnetBanner } from "../../components/brand/TestnetBanner";
import { MoneyCard } from "../../components/brand/MoneyCard";

export const metadata: Metadata = {
  title: "You just received money — Lumenia",
  description: "You received money with Lumenia. Here's what that means.",
};

const POINTS: Array<{ title: string; body: string }> = [
  { title: "It's yours.", body: "Once you've claimed it, it's yours to keep — nobody can take it back." },
  {
    title: "It's held in dollars.",
    body: "The amount doesn't melt away or wobble. Hold it as long as you like.",
  },
  { title: "No app, no account.", body: "You claimed it right in your browser — nothing to install." },
  {
    title: "You can pass it on. (soon)",
    body: "Soon you'll be able to send money onward with a link of your own.",
  },
];

export default function Claimed() {
  return (
    <main className="min-h-dvh bg-paper text-ink">
      <TestnetBanner />
      <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-12">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">You just received money.</h1>
          <p className="text-ink-soft">Here's what that means.</p>
        </header>

        <div className="flex flex-col gap-3">
          {POINTS.map((p) => (
            <MoneyCard key={p.title} className="p-5">
              <p className="font-semibold text-ink">{p.title}</p>
              <p className="mt-1 text-ink-soft">{p.body}</p>
            </MoneyCard>
          ))}
        </div>

        <p className="text-center text-xs text-ink-soft">Delivered by Lumenia</p>
      </div>
    </main>
  );
}
