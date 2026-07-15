/**
 * (site) route group — the public LANDING, on the LOCKED "Periwinkle" system (Sentient +
 * Switzer via the Fontshare CSS API), with NO testnet banner and its own immersive chrome
 * (the opening's own wordmark). It sits in a SEPARATE group from (marketing) on purpose, so the
 * landing does not inherit the legacy warm-paper green chrome / Plus Jakarta; the other 17
 * marketing routes migrate later (landing-first, brand.md §13). The claim route /c/[id] lives
 * outside this group and stays webfont-free.
 */
import type { Metadata, Viewport } from "next";
// Sentient + Switzer, self-hosted — replaces the api.fontshare.com stylesheet, which was two extra
// origins of DNS/TLS/round-trips sitting in front of the first paint. Same family names, same faces.
import "../../components/site/fonts.css";
// Scoped here, not in the root layout: the ::view-transition rules are document-level, but only
// this group has a ThemeToggle to start one — so the frozen claim route never loads them.
import "../../components/site/theme-transition.css";
import { SiteNav } from "../../components/site/SiteNav";
import { ThemeProvider } from "../../components/site/ThemeProvider";

const TITLE = "Lumenia — money home, in a link";
const DESCRIPTION =
  "Send money by link. They tap it and it's theirs — no wallet, no seed phrase, no app. Held in dollars until they need it.";

/**
 * The landing's metadata. (site) is the landing alone today, so route-specific fields (canonical)
 * live here; if the group ever gains a second route, they move down to page.tsx.
 *
 * The OG/Twitter card is a real asset (public/og.png), not a screenshot: the wordmark, the locked
 * §6 hero line and the messenger, on the landing's own paper. Both are absolute via the root
 * layout's metadataBase — link crawlers reject relative image URLs.
 *
 * Vocabulary law (lib/copy.ts) applies here as much as in the UI: no wallet/crypto/Stellar/gas.
 * "no wallet, no seed phrase" is the approved subtraction line — it names what you DON'T need.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Lumenia",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Lumenia — money home, in a link. The Lumenia messenger holding an envelope.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

/**
 * Overrides the root viewport for this group only.
 *
 * `maximumScale: 5` undoes the root's `maximumScale: 1`, which renders as user-scalable=no and
 * blocks pinch-zoom — a WCAG failure. Scoped here rather than fixed at the root because the root
 * also wraps the frozen claim route, which is grant evidence and is not in this task's blast
 * radius. It is worth fixing there too (a recipient reading an amount has more reason to zoom than
 * anyone) — that just needs the claim regression re-run alongside it.
 *
 * themeColor tracks the landing's own Periwinkle surfaces rather than the root's warm paper, and
 * follows the theme the way the page does.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F3EF" },
    { media: "(prefers-color-scheme: dark)", color: "#15121C" },
  ],
  maximumScale: 5,
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* Switzer 500 sets the greeting bubble — the first type anyone reads here. Self-hosted, so
          this is a same-origin preload on an already-open connection. */}
      <link rel="preload" as="font" type="font/woff2" href="/fonts/switzer-500.woff2" crossOrigin="" />
      {/* The wordmark IS the LCP element, but it is discovered
          late — it is an <img> deep in a client component. Both variants are preloaded because the
          theme picks one before paint and a miss costs the LCP; they are 7.5 KB each. */}
      <link rel="preload" as="image" href="/brand-kit-assets/logo-wordmark-t.svg" type="image/svg+xml" fetchPriority="high" />
      <link rel="preload" as="image" href="/brand-kit-assets/logo-wordmark-dark.svg" type="image/svg+xml" fetchPriority="high" />
      <SiteNav />
      {children}
    </ThemeProvider>
  );
}
