/**
 * SiteNav — the landing's persistent top nav. Hidden over the immersive opening hero (which has
 * its own wordmark), it slides + fades in once you scroll past the hero into the content. Built
 * with shadcn <Button> + Tailwind on the `.site-theme` Periwinkle scope, so it stays on-brand
 * without touching the legacy (marketing) chrome. Lives OUTSIDE the landing's `.op` scope.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/developers", label: "Developers" },
];

export function SiteNav() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 1.35);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "site-theme fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 transition-all duration-500 ease-out",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-6 opacity-0",
      )}
    >
      <div className="flex w-full max-w-5xl items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/80 px-4 py-2.5 shadow-[0_16px_40px_-24px_rgba(110,95,206,0.6)] backdrop-blur-xl">
        <Link href="/" className="px-1" aria-label="Lumenia — home">
          {/* Wordmark swaps per theme (paper-filled counters only read on light). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-kit-assets/logo-wordmark-t.svg" alt="" className="site-wordmark-light h-5 w-auto" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-kit-assets/logo-wordmark-dark.svg" alt="" className="site-wordmark-dark h-5 w-auto" />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-foreground/75 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button asChild className="rounded-xl px-4">
            <Link href="/demo">Try the demo</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
