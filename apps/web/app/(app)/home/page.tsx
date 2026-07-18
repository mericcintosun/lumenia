"use client";

/**
 * /home — the logged-in root + north-star surface (FRONTEND_PLAN §1). Real Horizon
 * reads only (no-mock-data): the balance you hold + your money in/out, in human
 * tense. Honest empty states. No seed ever touches this page — it reads only the
 * public address from the WalletProvider (signing for "collect" goes through
 * getSigner, the same seam /send uses).
 *
 * "Money waiting for you" is the returning asker's half of request money
 * (REQUEST_MONEY.md §10): a paid request arrives as a Claimable Balance whose
 * unconditional claimant is THIS address; collecting it is a bare claim through
 * the unchanged /feebump policy (Spike #6). It also catches any future transfer
 * sent straight to the address — the section is about the money, not the feature.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Split } from "lucide-react";
import { useWallet } from "../../../lib/wallet";
import { loadBalance, loadActivity, loadIncomingClaims, loadLinkStatus, type ActivityItem, type IncomingClaim } from "../../../lib/horizon";
import { collectIncoming } from "../../../lib/claim";
import { indicativeRate, getLiveRate } from "../../../lib/rate";
import { formatUsd } from "../../../lib/money";
import { BalanceHeader } from "../../../components/brand/BalanceHeader";
import { ActivityRow } from "../../../components/brand/ActivityRow";
import { LockMoneyCard } from "../../../components/brand/LockMoneyCard";
import { MoneyCard } from "../../../components/brand/MoneyCard";
import { PrimaryButton } from "../../../components/brand/PrimaryButton";
import { FeedbackDialog } from "../../../components/FeedbackDialog";
import { copy } from "../../../lib/copy";

const SPONSOR_URL = process.env.NEXT_PUBLIC_SPONSOR_URL ?? "https://lumenia-sponsor.vercel.app";

/** The home dashboard's primary actions — each a soft-3D brand icon, each a real destination.
 *  (Activity + Account live in the top nav; these are the money verbs.) */
const ACTIONS: Array<{ href: string; label: string; icon: string }> = [
  { href: "/send", label: "Send", icon: "/brand-kit-assets/icon-send.webp" },
  { href: "/request", label: "Ask", icon: "/brand-kit-assets/icon-hand.webp" },
  { href: "/contacts", label: "People", icon: "/brand-kit-assets/icon-contacts.webp" },
];

export default function HomePage() {
  const { status, account, getSigner } = useWallet();
  const router = useRouter();
  const [usd, setUsd] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [waiting, setWaiting] = useState<IncomingClaim[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [collectError, setCollectError] = useState("");
  // The ₺ line upgrades from the labeled fallback constant to the real ECB
  // reference rate when the fetch lands (lib/rate.ts). Still shown "indicative".
  const [rate, setRate] = useState(indicativeRate());

  useEffect(() => {
    let alive = true;
    void getLiveRate().then((r) => {
      if (alive && r.live) setRate(r.rate);
    });
    return () => {
      alive = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!account) return;
    const [bal, acts] = await Promise.all([
      loadBalance(account.address),
      loadActivity(account.address),
    ]);
    setUsd(bal?.usd ?? "0");
    setActivity(acts);
    // The trustline's own issuer pins the exact asset — a look-alike token can't
    // pose as money waiting. No trustline yet → nothing to collect into.
    setWaiting(bal?.issuer ? await loadIncomingClaims(account.address, bal.issuer) : []);
  }, [account]);

  useEffect(() => {
    if (!account) return;
    setLoadingData(true);
    let live = true;
    void reload().finally(() => {
      if (live) setLoadingData(false);
    });
    return () => {
      live = false;
    };
  }, [account, reload]);

  if (status === "loading") {
    return <p className="py-10 text-center text-ink-soft">Loading…</p>;
  }

  // No local account yet — honest empty (someone must send you a link first),
  // plus the one thing a person with no money CAN do here: ask for some.
  if (!account) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-xl font-bold text-ink">No money here yet</h1>
        <p className="max-w-xs text-ink-soft">
          When someone sends you money with a link, you claim it and it shows up here.
        </p>
        <Link
          href="/request"
          className="mt-2 flex h-12 items-center justify-center rounded-full bg-money px-6 text-sm font-semibold text-primary-foreground"
        >
          {copy.claim.ctaRequest}
        </Link>
        {/* A first-timer who deep-linked here needs a path INTO the product, not a wall. */}
        <Link href="/demo" className="text-sm font-semibold text-money underline-offset-2 hover:underline">
          Try the demo — receive real test money
        </Link>
        <Link href="/how-it-works" className="text-sm font-semibold text-money underline-offset-2 hover:underline">
          See how it works
        </Link>
        <Link href="/claimed" className="text-sm font-semibold text-money underline-offset-2 hover:underline">
          What is this?
        </Link>
      </div>
    );
  }

  async function collect(balanceId: string) {
    setCollectError("");
    setCollectingId(balanceId);
    try {
      let signer;
      try {
        signer = await getSigner();
      } catch {
        router.push("/unlock?next=/home");
        return;
      }
      await collectIncoming({ sponsorUrl: SPONSOR_URL, signer, balanceId });
      await reload();
    } catch {
      // Terminal vs. transient, by re-reading whether the balance still exists —
      // never leak a Horizon result code (vocabulary law). Gone = already collected
      // or reclaimed → say so calmly + refresh so the stale item disappears.
      try {
        if ((await loadLinkStatus(balanceId)) === "settled") {
          setCollectError(copy.errors.collectGone);
          await reload();
        } else {
          setCollectError(copy.errors.generic);
        }
      } catch {
        setCollectError(copy.errors.generic);
      }
    } finally {
      setCollectingId(null);
    }
  }

  const tryValue = Number.parseFloat(usd ?? "0") * rate;

  return (
    <div className="flex flex-col gap-5">
      <BalanceHeader usd={usd ?? "0"} tryValue={tryValue} phase={account.phase} />

      {/* Money waiting to be collected — a paid request, or any transfer straight
          to this account. Renders only when real money is actually waiting. */}
      {waiting.length > 0 && (
        <MoneyCard className="p-5">
          <p className="font-semibold text-ink">{copy.waiting.title}</p>
          <div className="mt-2 flex flex-col gap-3">
            {waiting.map((w) => (
              <div key={w.balanceId} className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink-soft">{copy.waiting.row(formatUsd(w.usd))}</p>
                <div className="shrink-0">
                  {/* One collect at a time: two in flight would build on the same
                      account sequence number and the second always fails. */}
                  <PrimaryButton
                    loading={collectingId === w.balanceId}
                    disabled={collectingId !== null && collectingId !== w.balanceId}
                    loadingLabel={copy.waiting.collecting}
                    onClick={() => collect(w.balanceId)}
                  >
                    {copy.waiting.collect}
                  </PrimaryButton>
                </div>
              </div>
            ))}
          </div>
          {collectError && (
            <p className="mt-2 text-sm text-danger">
              {collectError}{" "}
              <FeedbackDialog trigger={copy.feedback.somethingWrong} triggerClassName="fb-trigger-inline" defaultCategory="money" />
            </p>
          )}
        </MoneyCard>
      )}

      {/* Primary actions — a soft-3D icon tile each (the brand icon set, in the screens it was drawn
          for). Every tile goes to a surface that exists; no mock actions. */}
      <nav className="app-actions">
        {ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="app-action">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.icon} alt="" width={46} height={46} />
            <span>{a.label}</span>
          </Link>
        ))}
      </nav>

      {/* Split — a request-money composition (one link per person). A quiet entry, not a big tile. */}
      <Link
        href="/split"
        className="flex items-center gap-3 rounded-[16px] border border-line bg-surface px-4 py-3 transition-colors hover:border-money/40"
      >
        <span className="grid size-9 place-items-center rounded-full bg-secondary text-money">
          <Split className="size-4" />
        </span>
        <span className="flex-1 text-sm font-semibold text-ink">Split a bill</span>
        <span className="text-ink-soft">→</span>
      </Link>

      {account.phase === 1 && <LockMoneyCard />}

      {/* Activity — the most recent few; the full history lives on /activity. */}
      <section>
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink-soft">Activity</h2>
          {activity.length > 0 && (
            <Link href="/activity" className="text-xs font-semibold text-money underline-offset-2 hover:underline">
              See all
            </Link>
          )}
        </div>
        {loadingData && activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">Loading…</p>
        ) : activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">
            No activity yet — send your first link.
          </p>
        ) : (
          <div className="rounded-[20px] border border-line bg-surface px-4">
            {activity.slice(0, 5).map((a) => (
              <ActivityRow key={a.id} direction={a.direction} usd={a.usd} at={a.at} />
            ))}
          </div>
        )}
      </section>

      {/* Cash-out — delegated to a licensed partner; Lumenia never converts. Stated as an
          info row, not dead buttons: no affordance is promised that can't be tapped. */}
      <MoneyCard className="p-5">
        <p className="font-semibold text-ink">{copy.cashOut.title}</p>
        <p className="mt-1 text-sm text-ink-soft">{copy.cashOut.infoRow}</p>
      </MoneyCard>
    </div>
  );
}
