/**
 * ThemeToggle — the landing's light/dark switch, lives in SiteNav. Uses next-themes' resolvedTheme
 * (so it reflects the system default until the user picks) and flips between light and dark.
 * Renders a stable placeholder until mounted to avoid a hydration mismatch (the server can't know
 * the resolved theme). shadcn ghost icon button on the `.site-theme` Periwinkle scope.
 *
 * The flip is the boot opening's sibling (see sections/BootOpening.tsx): the boot pulls a circle of
 * light INTO the wordmark's "i"; this pushes one OUT of this button. Same circle() clip-path, same
 * easing, same lumen spark — inverse direction. Mechanics differ because the subject differs: the
 * boot animates its own coloured field, while here the thing being revealed is the page itself, so
 * the wipe rides the View Transitions API and the styling lives in ./theme-transition.css.
 *
 * flushSync is load-bearing: startViewTransition snapshots the DOM when its callback returns, and
 * next-themes writes data-theme from an effect. Without the flush the callback returns before the
 * attribute lands, so both snapshots capture the OLD theme and the wipe reveals nothing.
 *
 * Falls back to an instant flip where a sweep would be wrong or unavailable: reduced motion, and
 * browsers without the API (Firefox) — the theme still changes, it just does not travel.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/** Matches the boot's contraction, so the two motions feel like one hand. */
const SWEEP_MS = 720;
const SWEEP_EASE = "cubic-bezier(.66,0,.2,1)";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sparkRef = useRef<HTMLSpanElement>(null);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  const flip = useCallback(() => {
    const next = isDark ? "light" : "dark";
    const button = buttonRef.current;
    const doc = document as ViewTransitionDocument;
    const sweepable =
      typeof doc.startViewTransition === "function" &&
      button !== null &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!sweepable) {
      setTheme(next);
      return;
    }

    // The wipe starts at the button and has to reach the farthest corner to cover the viewport.
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const spark = sparkRef.current;
    if (spark) {
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.classList.remove("theme-spark--lit");
      void spark.offsetWidth; // restart the flash on a rapid re-toggle
    }

    const transition = doc.startViewTransition(() => flushSync(() => setTheme(next)));
    void transition.ready.then(() => {
      spark?.classList.add("theme-spark--lit");
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        },
        {
          duration: SWEEP_MS,
          easing: SWEEP_EASE,
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }, [isDark, setTheme]);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="rounded-xl text-foreground/70 hover:text-foreground"
        aria-label={!mounted ? "Toggle theme" : isDark ? "Switch to light theme" : "Switch to dark theme"}
        onClick={flip}
      >
        {/* Until mounted the server can't know the resolved theme; render a stable icon (no mismatch). */}
        {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
      </Button>
      {/* Portalled to <body> on purpose. The spark is position:fixed and placed by viewport
          coordinates, but SiteNav's header carries a Motion transform and its nav a backdrop-blur —
          either is enough to make itself the containing block for fixed descendants. Left in the
          nav, the spark resolves against the nav's box and lands ~128px off the button. */}
      {mounted && createPortal(<span ref={sparkRef} className="theme-spark" aria-hidden="true" />, document.body)}
    </>
  );
}
