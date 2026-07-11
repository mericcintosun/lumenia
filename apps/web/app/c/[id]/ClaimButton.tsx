"use client";

import { useState } from "react";
import { copy } from "../../../lib/copy";
import { runClaim } from "../../../lib/sponsor";

/**
 * The claim action — runs AFTER the user has already seen their money
 * (value-first). It reads the bearer key from the URL #fragment (never sent to a
 * server), asks the sponsor to create a 0-XLM account + trustline, then submits a
 * fee-bumped claim. The recipient holds 0 XLM and pays no gas.
 *
 * Out of scope for this sprint (SOW): recovery / passkeys / Argon2id — the key
 * here comes straight from the link.
 */
const SPONSOR_URL = process.env.NEXT_PUBLIC_SPONSOR_URL ?? "https://lumenia-sponsor.vercel.app";
const explorer = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;

export default function ClaimButton({ claimId, balanceId }: { claimId: string; balanceId?: string }) {
  const [state, setState] = useState<"idle" | "claiming" | "done" | "error">("idle");
  const [hash, setHash] = useState("");
  const [error, setError] = useState("");

  async function onClaim() {
    setState("claiming");
    setError("");
    try {
      const bearerSecret = window.location.hash.slice(1);
      if (!bearerSecret) throw new Error("This link is invalid (missing key).");
      if (!balanceId) throw new Error("This link is invalid (missing balance info).");
      const { hash } = await runClaim({ sponsorUrl: SPONSOR_URL, bearerSecret, balanceId });
      setHash(hash);
      setState("done");
    } catch (e) {
      setError((e as Error).message);
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div>
        <p style={{ fontWeight: 600 }}>{copy.claim.done}</p>
        <a
          className="muted"
          href={explorer(hash)}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: "0.75rem", wordBreak: "break-all", display: "inline-block", marginTop: "0.5rem" }}
        >
          {hash}
        </a>
        {/* Delegated cash-out placeholder (SOW W4) — a licensed provider converts,
            Lumenia never does; no live conversion in this sprint. */}
        <div style={{ marginTop: "1.5rem" }}>
          <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>{copy.cashOut.title}</p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn" disabled title={copy.cashOut.soon} style={{ opacity: 0.5 }}>
              {copy.cashOut.spendCard} · {copy.cashOut.soon.toLowerCase()}
            </button>
            <button className="btn" disabled title={copy.cashOut.soon} style={{ opacity: 0.5 }}>
              {copy.cashOut.toTry} · {copy.cashOut.soon.toLowerCase()}
            </button>
          </div>
          <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>{copy.cashOut.delegatedNote}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <button className="btn" onClick={onClaim} disabled={state === "claiming"} data-claim-id={claimId}>
        {state === "claiming" ? copy.claim.claiming : copy.claim.claimCta}
      </button>
      {state === "error" && (
        <p style={{ color: "#c0392b", fontSize: "0.8rem", marginTop: "0.75rem" }}>{error}</p>
      )}
    </>
  );
}
