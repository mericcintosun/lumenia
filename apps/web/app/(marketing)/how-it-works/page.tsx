/**
 * /how-it-works — THE trust page, and the ONLY surface allowed to name the tech
 * (FRONTEND_PLAN §0/§8): Stellar, Claimable Balances, sponsored reserves, the
 * explorer. Live testnet proof links to REAL transfers. "The audit trail for the
 * non-custodial claim." Also serves grant reviewers + partners.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works — the audit trail — Lumenia",
  description:
    "The honest, technical account: how a walletless, gasless claim works, and how to verify a real transfer yourself.",
};

const explorer = (h: string) => `https://stellar.expert/explorer/testnet/tx/${h}`;

// Real, publicly-verifiable testnet transfers (HANDOFF/EVIDENCE).
const PROOFS: Array<{ hash: string; what: string }> = [
  { hash: "b9ef1844c6ca2df732648b965a2f991ba0197643057b2c9e2a60ab52c3e23746", what: "A walletless claim: 20 USDC landed in a brand-new account that holds 0 XLM." },
  { hash: "fe528fe145018ea7d05c4028f01c155025535054b9a674c0df3a4aa03f6de43c", what: "A recent claim, from the automated end-to-end check." },
];

export default function HowItWorks() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
        How it works — and how to check it
      </h1>
      <p className="mt-4 text-ink-soft">
        Everywhere else on this site we talk about money and people. Here we&apos;ll name the technology,
        because the non-custodial claim is only credible if a skeptic can verify it. This is the audit trail.
      </p>

      <section className="mt-10 flex flex-col gap-6 text-ink-soft">
        <div>
          <h2 className="font-heading text-xl font-bold text-ink">Built on Stellar</h2>
          <p className="mt-2">
            Lumenia is built on the <strong className="text-ink">Stellar</strong> network — a fast, low-cost
            public ledger. The money is <strong className="text-ink">USDC</strong>, a dollar-denominated
            asset. Lumenia never takes custody: the money lives on the ledger, not in a Lumenia account.
          </p>
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold text-ink">The money waits in a Claimable Balance</h2>
          <p className="mt-2">
            When you send, the amount is locked in a{" "}
            <strong className="text-ink">Claimable Balance</strong> with two claimants: your recipient (who
            can claim it any time) and you (who can reclaim it after 7 days). No one else — including Lumenia —
            can move it.
          </p>
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold text-ink">Your recipient pays nothing</h2>
          <p className="mt-2">
            A new Stellar account normally needs a small reserve of the network&apos;s native asset (XLM) and a
            fee to transact. Lumenia&apos;s sponsor service covers both — via{" "}
            <strong className="text-ink">sponsored reserves</strong> and a{" "}
            <strong className="text-ink">fee-bump</strong> — so your recipient holds 0 XLM and pays no gas. The
            sponsor can only create accounts and pay fees; an allowlist validator rejects any transaction that
            would move value, so the sponsor can never spend your money.
          </p>
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold text-ink">Every transfer is public</h2>
          <p className="mt-2">
            Each claim produces a transaction on the public ledger. You don&apos;t have to trust us — open one
            on the explorer and see the money land in an account that holds 0 XLM:
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {PROOFS.map((p) => (
              <li key={p.hash} className="rounded-[16px] border border-line bg-surface p-4">
                <p className="text-ink">{p.what}</p>
                <a
                  href={explorer(p.hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all text-xs text-money underline-offset-2 hover:underline"
                >
                  {p.hash} ↗
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            Currently on Stellar&apos;s <strong className="text-ink">test network</strong> with test money —
            we say so plainly. The mechanism is exactly what will run with real funds.
          </p>
        </div>
      </section>
    </main>
  );
}
