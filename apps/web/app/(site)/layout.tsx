/**
 * (site) route group — the public LANDING, on the LOCKED "Periwinkle" system (Sentient +
 * Switzer via the Fontshare CSS API), with NO testnet banner and its own immersive chrome
 * (the opening's own wordmark). It sits in a SEPARATE group from (marketing) on purpose, so the
 * landing does not inherit the legacy warm-paper green chrome / Plus Jakarta; the other 17
 * marketing routes migrate later (landing-first, brand.md §13). The claim route /c/[id] lives
 * outside this group and stays webfont-free.
 */
import type { Metadata } from "next";
import { SiteNav } from "../../components/site/SiteNav";
import { ThemeProvider } from "../../components/site/ThemeProvider";

const FONTSHARE =
  "https://api.fontshare.com/v2/css?f[]=sentient@500,600&f[]=switzer@400,500,600&display=swap";

export const metadata: Metadata = {
  title: "Lumenia — money home, in a link",
  description:
    "Send money by link. They tap it and it's theirs — no wallet, no seed phrase, no app. Held in dollars until they need it.",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={FONTSHARE} />
      <SiteNav />
      {children}
    </ThemeProvider>
  );
}
