import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, getGuide } from "../../../../lib/learn";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const g = getGuide((await params).slug);
  return g ? { title: `${g.title} — Lumenia`, description: g.summary } : { title: "Learn — Lumenia" };
}

export default async function Guide({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <Link href="/learn" className="text-sm text-money underline-offset-2 hover:underline">
        ← All guides
      </Link>
      <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
        {g.title}
      </h1>
      <div className="mt-6 flex flex-col gap-4 text-ink-soft">
        {g.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </main>
  );
}
