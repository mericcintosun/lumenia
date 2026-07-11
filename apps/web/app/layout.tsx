import type { Metadata, Viewport } from "next";
import { copy } from "../lib/copy";
import "./globals.css";

export const metadata: Metadata = {
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
