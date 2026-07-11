import type { Metadata, Viewport } from "next";
import { copy } from "../lib/copy";
import "./globals.css";

// Root layout stays webfont-free on purpose: it wraps EVERY route, including the
// claim page /c/[id], whose hard budget is zero webfonts (FRONTEND_PLAN §5b). The
// humanist heading font is introduced later in the (site)/app layouts only, so it
// never reaches the claim route. Body font = system stack (see globals.css).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lumenia-chi.vercel.app";

export const metadata: Metadata = {
  // metadataBase makes per-claim OG image URLs absolute (required by link crawlers).
  metadataBase: new URL(SITE_URL),
  title: copy.appName,
  description: copy.landing.sub,
  applicationName: copy.appName,
  appleWebApp: { capable: true, statusBarStyle: "default", title: copy.appName },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
