"use client";

/**
 * /send — the loop's engine (FRONTEND_PLAN §1/§3). A recipient who claimed sends
 * money onward: amount → your name → a link to share. Value-first for senders too
 * (no credential until needed). The sender holds 0 XLM, so the sponsor sponsors the
 * new Claimable Balance's reserve + fee-bumps (Spike #5).
 *
 * Owner caveat C4 — the first-sender onboarding chain (key → create-account →
 * faucet → CB) is honoured: a just-claimed account already has an account +
 * trustline + USDC, so it sends straight away; a zero-balance account sees
 * "Get test money" (the faucet) first.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "../../../lib/wallet";
import { loadBalance } from "../../../lib/horizon";
import { createSendLink } from "../../../lib/send";
import { sendEvent } from "../../../lib/events";
import { AmountDisplay } from "../../../components/brand/AmountDisplay";
import { PrimaryButton } from "../../../components/brand/PrimaryButton";
import { LinkReadyCard } from "../../../components/brand/LinkReadyCard";

const SPONSOR_URL = process.env.NEXT_PUBLIC_SPONSOR_URL ?? "https://lumenia-sponsor.vercel.app";

interface SentRecord {
  balanceId: string;
  link: string;
  amount: string;
  from: string;
  at: string;
}

function saveSent(id: string, rec: SentRecord) {
  try {
    const all = JSON.parse(localStorage.getItem("lumenia.sent") ?? "{}") as Record<string, SentRecord>;
    all[id] = rec;
    localStorage.setItem("lumenia.sent", JSON.stringify(all));
  } catch {
    /* localStorage blocked — the link still works, just no local tracking */
  }
}

export default function SendPage() {
  const { status, account, getSigner } = useWallet();
  const router = useRouter();
  const [balance, setBalance] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [faucetBusy, setFaucetBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState<{ link: string; balanceId: string } | null>(null);

  useEffect(() => {
    if (account) void loadBalance(account.address).then((b) => setBalance(b?.usd ?? "0"));
  }, [account]);

  if (status === "loading") return <p className="py-10 text-center text-ink-soft">Loading…</p>;
  if (!account) {
    if (typeof window !== "undefined") router.replace("/home");
    return null;
  }

  async function getTestMoney() {
    setFaucetBusy(true);
    setError("");
    try {
      const res = await fetch(`${SPONSOR_URL}/faucet`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipientPublicKey: account!.address }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "faucet unavailable");
      const b = await loadBalance(account!.address);
      setBalance(b?.usd ?? "0");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFaucetBusy(false);
    }
  }

  async function send() {
    setError("");
    const amt = Number.parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError("Enter an amount to send.");
    if (balance !== null && amt > Number.parseFloat(balance)) return setError("That's more than you have.");
    if (!from.trim()) return setError("Add your name so they know who it's from.");

    setBusy(true);
    try {
      let signer;
      try {
        signer = await getSigner();
      } catch {
        // Phase-2 account is locked → unlock, then come back and finish.
        router.push("/unlock?next=/send");
        return;
      }
      void sendEvent("send_started", account!.address);
      const result = await createSendLink({
        sponsorUrl: SPONSOR_URL,
        signer,
        amount: amt.toFixed(2),
        from: from.trim(),
        webOrigin: window.location.origin,
      });
      saveSent(result.balanceId.slice(-8), {
        balanceId: result.balanceId,
        link: result.link,
        amount: amt.toFixed(2),
        from: from.trim(),
        at: new Date().toISOString(),
      });
      // The sponsor has always allowed this one; nothing ever fired it. Paired with send_started it
      // is the only way to see the send flow's own drop-off — how many people who begin a send end
      // up with a link they can share.
      void sendEvent("send_link_created", account!.address);
      setReady({ link: result.link, balanceId: result.balanceId });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (ready) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <h1 className="text-xl font-bold text-ink">Done — share the link</h1>
        <LinkReadyCard link={ready.link} balanceId={ready.balanceId} from={from.trim()} />
      </div>
    );
  }

  const zeroBalance = balance !== null && Number.parseFloat(balance) <= 0;

  return (
    <div className="flex flex-col gap-5 py-4">
      <header>
        <h1 className="text-xl font-bold text-ink">Send money</h1>
        {balance !== null && (
          <p className="mt-1 text-sm text-ink-soft">
            You have <AmountDisplay value={balance} size="md" tone="ink" className="!text-base" /> to send.
          </p>
        )}
      </header>

      {zeroBalance ? (
        <div className="flex flex-col gap-3">
          <p className="text-ink-soft">You don't have any money to send yet.</p>
          <PrimaryButton loading={faucetBusy} loadingLabel="Getting test money…" onClick={getTestMoney}>
            Get test money
          </PrimaryButton>
          <p className="text-xs text-ink-soft">Test network — this money isn't real.</p>
        </div>
      ) : (
        <>
          <label className="text-sm text-ink-soft">
            Amount
            <div className="mt-1 flex items-center rounded-[14px] border border-line bg-surface px-3">
              <span className="text-lg text-ink-soft">$</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                className="w-full bg-transparent px-2 py-3 text-lg text-ink outline-none"
              />
            </div>
          </label>
          <label className="text-sm text-ink-soft">
            Your name
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="e.g. Meriç"
              className="mt-1 w-full rounded-[14px] border border-line bg-surface px-3 py-3 text-ink"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <PrimaryButton loading={busy} loadingLabel="Making your link…" onClick={send}>
            Create a money link
          </PrimaryButton>
        </>
      )}
      {error && zeroBalance && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
