/**
 * Footer — the dark Periwinkle footer closing the landing: the link mark, tagline, nav columns,
 * and the SCF seal. Per the owner logo rule, no text "Lumenia" — the link mark stands in for it.
 */
import Link from "next/link";

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot-inner">
        <div className="foot-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="foot-mark" src="/brand-kit-assets/mark-link.webp" alt="Lumenia" />
          <p className="foot-tag">Money home, without the ordeal.</p>
        </div>
        <nav className="foot-nav">
          <div className="foot-col">
            <span className="foot-ct">Product</span>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/demo">Live demo</Link>
            <Link href="/waitlist">Waitlist</Link>
          </div>
          <div className="foot-col">
            <span className="foot-ct">Company</span>
            <Link href="/about">About</Link>
            <Link href="/roadmap">Roadmap</Link>
            <Link href="/developers">Developers</Link>
          </div>
          <div className="foot-col">
            <span className="foot-ct">Legal</span>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </nav>
      </div>
      <div className="foot-bottom">
        <span>Your money is never ours. That’s the point.</span>
        <span className="foot-seal">
          <span className="foot-seal-star" aria-hidden="true" />
          Backed by the Stellar Community Fund
        </span>
      </div>
    </footer>
  );
}
