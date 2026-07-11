"use client";

/**
 * PrimaryButton — the money-green 56px full-width pill (FRONTEND_PLAN §5), built on
 * the shadcn Button primitive (never the stock look). In-place loading morph: while
 * `loading`, it shows a spinner and disables — it NEVER navigates while working
 * (webview back-buttons are landmines; the money-moving pulse happens in place).
 *
 * This is the app/landing primary action. The claim route's button is a separate
 * CSS-only implementation (no Motion/JS-anim bundle on /c/[id]).
 */
import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrimaryButton({
  children,
  loading = false,
  loadingLabel,
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <Button
      className={cn(
        "h-14 w-full rounded-full px-8 text-base font-semibold",
        "bg-money text-primary-foreground hover:bg-money/90 active:bg-money-pressed",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-5 animate-spin" aria-hidden />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
