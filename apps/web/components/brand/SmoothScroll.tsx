/**
 * SmoothScroll — a Lenis provider (client). Wraps a scroll experience so the page
 * scrolls with inertia; Motion's useScroll reads the (Lenis-driven) window scroll, so
 * scroll-linked animations stay in sync. Honours prefers-reduced-motion (no smoothing).
 * Isolated to /brand-kit for now; can wrap the marketing group later.
 */
"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 1 });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
