import type { Metadata } from "next";
import Link from "next/link";
import { MoneyCard } from "../../../components/brand/MoneyCard";

export const metadata: Metadata = { title: "Tools — Lumenia" };

const TOOLS: Array<{ href: string; t: string; b: string }> = [
  { href: "/tools/verify", t: "Verify a transfer", b: "Paste a transfer code and see the real, public record behind it." },
  { href: "/tools/link-check", t: "Check a money link", b: "Paste a link to see if it's still waiting, claimed, or returned." },
  { href: "/tools/usd-try", t: "USD ↔ TRY", b: "An indicative dollar-to-lira estimate." },
  { href: "/tools/cost", t: "What it costs", b: "What sending money home usually costs — and what Lumenia costs today." },
];

export default function Tools() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Tools</h1>
      <p className="mt-3 text-ink-soft">Small, free tools — no account needed.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href}>
            <MoneyCard interactive className="h-full">
              <p className="font-heading text-lg font-bold text-ink">{t.t}</p>
              <p className="mt-1 text-ink-soft">{t.b}</p>
            </MoneyCard>
          </Link>
        ))}
      </div>
    </main>
  );
}
