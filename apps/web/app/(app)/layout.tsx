/**
 * (app) route group layout — wraps the logged-in app views (/home, /unlock) in the
 * single WalletProvider context + the AppShell. The claim route lives OUTSIDE this
 * group, so it gets neither the provider nor the shell (and stays lean). Route
 * groups don't affect URLs: (app)/home → /home.
 */
import type { Viewport } from "next";
import { WalletProvider } from "../../lib/wallet";
import { AppShell } from "../../components/brand/AppShell";

/**
 * `maximumScale: 5` undoes the root's `maximumScale: 1` (renders as
 * user-scalable=no — a WCAG failure) for this group only, the same scoped
 * override `(site)/layout.tsx` already carries and for the same reason: the root
 * also wraps the frozen claim route, which is not in this task's blast radius.
 * Money surfaces are exactly where people zoom.
 */
export const viewport: Viewport = {
  maximumScale: 5,
};

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <AppShell>{children}</AppShell>
    </WalletProvider>
  );
}
