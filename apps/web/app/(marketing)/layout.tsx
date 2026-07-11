/**
 * (marketing) route group — the public site (landing + trust + tools + learn +
 * legal orbit). Header + four-column footer + the site-wide testnet banner, plus
 * the humanist heading font (Plus Jakarta Sans) scoped HERE via --font-jakarta —
 * so it never reaches the webfont-free claim route (which lives outside this group).
 * Route groups don't affect URLs: (marketing)/how-it-works → /how-it-works.
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
