import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "../../../lib/learn";
import { MoneyCard } from "../../../components/brand/MoneyCard";

export const metadata: Metadata = { title: "Learn — Lumenia" };

export default function Learn() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Learn</h1>
      <p className="mt-3 text-ink-soft">Plain-language guides — no jargon, no crypto.</p>
      <div className="mt-8 flex flex-col gap-4">
        {GUIDES.map((g) => (
          <Link key={g.slug} href={`/learn/${g.slug}`}>
            <MoneyCard interactive>
              <p className="font-heading text-lg font-bold text-ink">{g.title}</p>
              <p className="mt-1 text-ink-soft">{g.summary}</p>
            </MoneyCard>
          </Link>
        ))}
      </div>
    </main>
  );
}
