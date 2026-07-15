/**
 * /learn/[slug] — a single guide. Rebuilt on the Periwinkle system and moved here from (marketing).
 *
 * Statically generated from lib/learn.ts (generateStaticParams), body copy unchanged. The guide's
 * own title is the h1 and its summary is the lead — the summary was written as a one-line answer to
 * the title, which is exactly what a lead is, and the old page dropped it on the article page and
 * showed it only in the index.
 *
 * The next/previous row at the end is real navigation, not a recommendation engine: five guides in
 * a fixed editorial order, so "what to read next" is simply the next one.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, getGuide } from "../../../../lib/learn";
import { Footer } from "../../../../components/site/sections/Footer";
import "../../../../components/site/page.css";
import "../../../../components/site/editorial.css";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = getGuide((await params).slug);
  if (!g) return { title: "Learn — Lumenia" };
  const title = `${g.title} — Lumenia`;
  return {
    title,
    description: g.summary,
    alternates: { canonical: `/learn/${g.slug}` },
    openGraph: {
      type: "article",
      url: `/learn/${g.slug}`,
      siteName: "Lumenia",
      title,
      description: g.summary,
      locale: "en_US",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Lumenia — money home, in a link." }],
    },
    twitter: { card: "summary_large_image", title, description: g.summary, images: ["/og.png"] },
  };
}

export default async function Guide({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const g = getGuide(slug);
  if (!g) notFound();

  const i = GUIDES.findIndex((x) => x.slug === slug);
  const next = GUIDES[i + 1];

  return (
    <div className="pg ed">
      <header className="pg-hero pg-glow">
        <div className="pg-hero-inner">
          <Link className="ed-back" href="/learn">
            <span className="ed-back-arrow" aria-hidden="true">
              ←
            </span>
            All guides
          </Link>
          <h1 className="pg-h1">{g.title}</h1>
          <p className="pg-lead">{g.summary}</p>
        </div>
      </header>

      <section className="ed-body">
        <article className="ed-prose">
          {g.body.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </article>

        <div className="ed-close">
          {next ? (
            <p className="ed-close-p">
              Next: <Link href={`/learn/${next.slug}`}>{next.title}</Link>
            </p>
          ) : (
            <p className="ed-close-p">
              That&apos;s the set. <Link href="/learn">Back to all guides</Link>, or see it for
              yourself.
            </p>
          )}
          <div className="pg-cta">
            <Link className="pg-btn pg-btn-primary" href="/demo">
              Try the live demo
            </Link>
            <Link className="pg-btn pg-btn-ghost" href="/how-it-works">
              How it works
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
