"use client";

/**
 * /home — the logged-in root + north-star surface (FRONTEND_PLAN §1). Real Horizon
 * reads only (no-mock-data): the balance you hold + your money in/out, in human
 * tense. Honest empty states. The primary Send action goes live in Stage 5; the
 * request teaser + cash-out are honest placeholders. No seed ever touches this page
 * — it reads only the public address from the WalletProvider.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "../../../lib/wallet";
import { loadBalance, loadActivity, type ActivityItem } from "../../../lib/horizon";
import { indicativeRate } from "../../../lib/rate";
import { BalanceHeader } from "../../../components/brand/BalanceHeader";
import { ActivityRow } from "../../../components/brand/ActivityRow";
import { LockMoneyCard } from "../../../components/brand/LockMoneyCard";
import { MoneyCard } from "../../../components/brand/MoneyCard";
import { copy } from "../../../lib/copy";

export default function HomePage() {
  const { status, account } = useWallet();
  const [usd, setUsd] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!account) return;
    setLoadingData(true);
    let live = true;
    void (async () => {
      try {
        const [bal, acts] = await Promise.all([
          loadBalance(account.address),
          loadActivity(account.address),
        ]);
        if (!live) return;
        setUsd(bal?.usd ?? "0");
        setActivity(acts);
      } finally {
        if (live) setLoadingData(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [account]);

  if (status === "loading") {
    return <p className="py-10 text-center text-ink-soft">Loading…</p>;
  }

  // No local account yet — honest empty (someone must send you a link first).
  if (!account) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-xl font-bold text-ink">No money here yet</h1>
        <p className="max-w-xs text-ink-soft">
          When someone sends you money with a link, you claim it and it shows up here.
        </p>
        <Link href="/claimed" className="text-sm font-semibold text-money underline-offset-2 hover:underline">
          What is this?
        </Link>
      </div>
    );
  }

  const tryValue = Number.parseFloat(usd ?? "0") * indicativeRate();

  return (
    <div className="flex flex-col gap-5">
      <BalanceHeader usd={usd ?? "0"} tryValue={tryValue} phase={account.phase} />

      {/* Primary action — Send goes live in Stage 5; honest disabled until then. */}
      <button
        disabled
        title="Coming soon"
        className="h-14 w-full rounded-full bg-money text-base font-semibold text-primary-foreground opacity-60"
      >
        {copy.claim.ctaSend} · {copy.claim.soon}
      </button>

      {account.phase === 1 && <LockMoneyCard />}

      {/* Activity */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-ink-soft">Activity</h2>
        {loadingData && activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">Loading…</p>
        ) : activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">
            No activity yet — send your first link.
          </p>
        ) : (
          <div className="rounded-[20px] border border-line bg-surface px-4">
            {activity.map((a) => (
              <ActivityRow key={a.id} direction={a.direction} usd={a.usd} at={a.at} />
            ))}
          </div>
        )}
      </section>

      {/* Cash-out placeholder — a licensed partner converts; Lumenia never does. */}
      <MoneyCard className="p-5">
        <p className="font-semibold text-ink">{copy.cashOut.title}</p>
        <p className="mt-1 text-sm text-ink-soft">{copy.cashOut.delegatedNote}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled className="h-11 rounded-full bg-secondary px-4 text-sm text-ink-soft opacity-70">
            {copy.cashOut.spendCard} · {copy.cashOut.soon.toLowerCase()}
          </button>
          <button disabled className="h-11 rounded-full bg-secondary px-4 text-sm text-ink-soft opacity-70">
            {copy.cashOut.toTry} · {copy.cashOut.soon.toLowerCase()}
          </button>
        </div>
      </MoneyCard>
    </div>
  );
}
