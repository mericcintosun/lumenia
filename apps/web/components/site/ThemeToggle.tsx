/**
 * ThemeToggle — the landing's light/dark switch, lives in SiteNav. Uses next-themes' resolvedTheme
 * (so it reflects the system default until the user picks) and flips between light and dark.
 * Renders a stable placeholder until mounted to avoid a hydration mismatch (the server can't know
 * the resolved theme). shadcn ghost icon button on the `.site-theme` Periwinkle scope.
 */
"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-xl text-foreground/70 hover:text-foreground"
      aria-label={!mounted ? "Toggle theme" : isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Until mounted the server can't know the resolved theme; render a stable icon (no mismatch). */}
      {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </Button>
  );
}
