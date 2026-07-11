/**
 * SiteFooter — four columns (FRONTEND_PLAN §1b: the "comprehensive product"
 * impression consolidates here). Closing line is Bri's, verbatim (§6).
 */
import Link from "next/link";

const COLS: Array<{ title: string; links: Array<[string, string]> }> = [
  {
    title: "Product",
    links: [
      ["How it works", "/how-it-works"],
      ["Live demo", "/demo"],
      ["Send money", "/send"],
      ["Roadmap", "/roadmap"],
    ],
  },
  {
    title: "Tools",
    links: [
      ["All tools", "/tools"],
      ["Check a link", "/tools/link-check"],
      ["Verify a transfer", "/tools/verify"],
      ["USD ↔ TRY", "/tools/usd-try"],
      ["What it costs", "/tools/cost"],
    ],
  },
  {
    title: "Learn",
    links: [
      ["Guides", "/learn"],
      ["About", "/about"],
      ["Developers", "/developers"],
    ],
  },
  {
    title: "Company",
    links: [
      ["Brand", "/brand"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Waitlist", "/waitlist"],
      ["Cash-out", "/cash-out"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-sm font-semibold text-ink">{col.title}</h3>
              <ul className="flex flex-col gap-2">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-ink-soft transition-colors hover:text-ink">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-line pt-6">
          <p className="font-heading text-base font-bold text-ink">
            Lumenia — money home, without the ordeal.
          </p>
          <p className="mt-1 text-sm text-ink-soft">Your money is never ours. That&apos;s the point.</p>
        </div>
      </div>
    </footer>
  );
}
