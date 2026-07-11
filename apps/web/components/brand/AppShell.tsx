/**
 * AppShell — the shell for logged-in app views (/home, /unlock). The claim page
 * deliberately has NO shell (FRONTEND_PLAN component inventory). Warm paper, a slim
 * Lumenia wordmark, the site-wide testnet banner. Server-safe.
 */
import Link from "next/link";
import { TestnetBanner } from "./TestnetBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <TestnetBanner />
      <header className="mx-auto flex max-w-md items-center px-5 py-4">
        <Link href="/home" className="text-lg font-bold tracking-tight text-ink">
          Lumenia
        </Link>
      </header>
      <div className="mx-auto max-w-md px-5 pb-16">{children}</div>
    </div>
  );
}
