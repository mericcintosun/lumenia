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

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
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
