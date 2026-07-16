"use client";

/**
 * AppShell — the Periwinkle chrome for the logged-in money surfaces. A sticky top nav (wordmark home
 * link + Home/Activity/Account + a notifications bell with a ledger-derived unread dot + the theme
 * toggle) over the `.app-pw` scope; the claim page deliberately has NO shell and lives outside this
 * group. Phone-first max-w-md column.
 *
 * Wraps everything in `.app-pw` so the token override in app-theme.css turns the whole group
 * Periwinkle without any component rewrite. The unread count is DERIVED from the public ledger
 * (lib/notifications) — no server, no push subscription.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useWallet } from "../../lib/wallet";
import { loadUnreadCount } from "../../lib/notifications";
import { TestnetBanner } from "./TestnetBanner";
import { ThemeToggle } from "../site/ThemeToggle";

const NAV = [
  { href: "/home", label: "Home" },
  { href: "/activity", label: "Activity" },
  { href: "/account", label: "Account" },
];

function NotificationsBell() {
  const { account } = useWallet();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!account) return setUnread(0);
    let live = true;
    void loadUnreadCount(account.address).then((n) => {
      if (live) setUnread(n);
    });
    return () => {
      live = false;
    };
    // re-check when the route changes (e.g. after collecting on /notifications the dot clears)
  }, [account, pathname]);

  return (
    <Link
      href="/notifications"
      className="relative grid size-9 place-items-center rounded-lg text-ink-soft transition-colors hover:text-ink"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <Bell className="size-[18px]" />
      {unread > 0 && (
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-money ring-2 ring-[var(--paper)]" />
      )}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-pw">
      <TestnetBanner />
      <header className="app-nav">
        <div className="app-nav-inner">
          <Link href="/home" aria-label="Lumenia — home">
            {/* Wordmark swaps per theme (paper-filled counters only read on light). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-kit-assets/logo-wordmark-t.svg" alt="Lumenia" className="app-wordmark site-wordmark-light" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-kit-assets/logo-wordmark-dark.svg" alt="" className="app-wordmark site-wordmark-dark" />
          </Link>
          <nav className="app-nav-links">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="app-nav-link"
                data-active={pathname === n.href}
              >
                {n.label}
              </Link>
            ))}
            <NotificationsBell />
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-md px-5 pb-16">{children}</div>
    </div>
  );
}
