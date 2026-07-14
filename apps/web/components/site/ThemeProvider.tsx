/**
 * ThemeProvider — a thin client wrapper over next-themes, scoped to the (site) route group ONLY.
 *
 * Deliberately NOT mounted in the root layout: that would inject next-themes' blocking script and
 * a data-theme attribute into EVERY route, including the frozen, byte-identical claim route
 * /c/[id]. Mounting it here keeps the claim + legacy (marketing) routes' HTML untouched.
 *
 * It drives the theme via the `data-theme` attribute on <html> — NOT the `.dark` class — so it
 * never triggers the legacy warm-paper `.dark {}` block in globals.css. The landing's dark styles
 * key off `:root[data-theme="dark"] .op` / `.site-theme` instead (landing.css + globals.css).
 */
"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
}
