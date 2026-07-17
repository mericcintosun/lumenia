/**
 * /brand-kit — INTERNAL brand workspace (not linked in nav, noindex). We explore
 * type pairings + palette directions here, with the REAL candidate faces, BEFORE
 * touching the landing. Stands OUTSIDE the (site) group on purpose: no SiteNav,
 * no testnet banner, no theme provider — its own chrome, its own fonts.
 *
 * Fonts load from the Fontshare CSS API (candidate faces only live on this route,
 * so nothing here reaches the webfont-free claim route). If the CDN is blocked the
 * specimens degrade to serif/sans fallbacks rather than breaking.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand Kit — Lumenia (internal)",
  robots: { index: false, follow: false },
};

const FONTSHARE =
  "https://api.fontshare.com/v2/css?" +
  [
    "f[]=sentient@400,500,700",
    "f[]=switzer@400,500,600,700",
    "f[]=clash-display@500,600,700",
    "f[]=satoshi@400,500,700",
    "f[]=cabinet-grotesk@500,700,800",
    "f[]=general-sans@400,500,600",
  ].join("&") +
  "&display=swap";

export default function BrandKitLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={FONTSHARE} />
      {/* Stellar's own pairing (Lora + Inter) — shown as a funder-alignment option. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=Inter:wght@400;500;600&display=swap"
      />
      {children}
    </>
  );
}
