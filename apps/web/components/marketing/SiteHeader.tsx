/**
 * SiteHeader — marketing nav (FRONTEND_PLAN §1b): Product · Demo · Tools · Learn +
 * the primary CTA. In pilot the CTA is "Try the live demo" (→ /demo), the fastest
 * path to the hero moment for a visitor with no account yet.
 */
import Link from "next/link";

const NAV = [
  { href: "/how-it-works", label: "Product" },
  { href: "/demo", label: "Demo" },
  { href: "/tools", label: "Tools" },
  { href: "/learn", label: "Learn" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link href="/" className="font-heading text-lg font-extrabold tracking-tight text-ink">
          Lumenia
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-ink-soft transition-colors hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/demo"
          className="rounded-full bg-money px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-money/90"
        >
          Try the live demo
        </Link>
      </div>
    </header>
  );
}
