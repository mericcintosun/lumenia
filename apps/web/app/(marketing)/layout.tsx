/**
 * (marketing) route group — what is LEFT of the public site on the retired warm-paper system:
 * the tools + learn + legal orbit. Header + four-column footer + the site-wide testnet banner,
 * plus the humanist heading font (Plus Jakarta Sans) scoped HERE via --font-jakarta — so it never
 * reaches the webfont-free claim route (which lives outside this group).
 *
 * This group is being emptied, not restyled. Each page moves to (site) as it is rebuilt on the
 * LOCKED Periwinkle system; route groups don't affect URLs, so a page keeps its URL and arrives
 * with the right chrome around it ((site)/how-it-works → /how-it-works was the first). When the
 * last page leaves, this layout, SiteHeader, SiteFooter and the warm-paper tokens go with it.
 */
import { Plus_Jakarta_Sans } from "next/font/google";
import { TestnetBanner } from "../../components/brand/TestnetBanner";
import { SiteHeader } from "../../components/marketing/SiteHeader";
import { SiteFooter } from "../../components/marketing/SiteFooter";

/**
 * `preload: false` because this group is no longer the site's centre of gravity — it is the part
 * being emptied, and its preload was being paid for by the pages that left.
 *
 * Measured: every (site) page downloaded this 27 KB face and used none of it. next/font emits a
 * <link rel="preload"> for the layout that declares it, and SiteNav + Footer still link to routes
 * that live here (/about, /developers, /roadmap, /privacy, /terms, /waitlist). Next prefetches
 * those, React hoists their preloads into the CURRENT document's head, and the landing,
 * /how-it-works and /demo each fetched a font they never render a glyph of.
 *
 * Dropping the preload does not stop this group's own pages using Jakarta — the @font-face still
 * ships in their CSS; it is discovered a beat later instead of up front. That is the right trade
 * for a legacy group that is being deleted, and it costs the pages that matter nothing.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  preload: false,
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${jakarta.variable} min-h-dvh bg-paper text-ink`}>
      <TestnetBanner />
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
