/**
 * TestnetBanner — the site-wide honest pilot banner (FRONTEND_PLAN §6 + the "honest
 * testnet banner everywhere" rule). Vocabulary-law safe: "pilot / test network" are
 * approved; no crypto terms. Server-safe. The full landing-hero version of this copy
 * lives in the landing section; this is the compact site-wide bar.
 */
import Link from "next/link";
import { cn } from "@/lib/utils";

export function TestnetBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full border-b border-line bg-secondary/60 px-4 py-2 text-center text-sm text-ink-soft",
        className,
      )}
    >
      <span>
        Lumenia is in <strong className="font-semibold text-ink">pilot on a test network</strong> — real
        technology, test money.{" "}
      </span>
      <Link href="/waitlist" className="font-semibold text-money underline-offset-2 hover:underline">
        Join the waitlist
      </Link>
    </div>
  );
}
