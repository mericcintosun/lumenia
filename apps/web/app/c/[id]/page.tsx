/**
 * Claim page — the hero, VALUE-FIRST (Kaan/Nicole + WhatsApp-webview research).
 *
 * The page shows the money IMMEDIATELY — "Alvin sent you money · $20" — with
 * NO credential, wallet, or crypto term in sight. The public claim metadata
 * (amount, sender, balanceId) rides in the URL query so the server can render it;
 * the bearer key rides in the #fragment and is read only client-side (ClaimButton).
 * The actual claim happens after the user has seen the value (deferred-credential).
 */
import { notFound } from "next/navigation";
import { getClaim, indicativeRate } from "../../../lib/claims";
import { formatUsd, usdToTryIndicative } from "../../../lib/money";
import { copy } from "../../../lib/copy";
import ClaimButton from "./ClaimButton";

interface ClaimView {
  id: string;
  senderName: string;
  usd: string;
  balanceId?: string;
}

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  // A real claim link carries public metadata in the query. Fall back to the stub
  // (demo / OG-card route) when it is absent.
  let claim: ClaimView | null;
  if (sp.a && sp.b) {
    claim = { id, senderName: sp.s ?? "Someone", usd: sp.a, balanceId: sp.b };
  } else {
    const stub = await getClaim(id);
    claim = stub ? { id: stub.id, senderName: stub.senderName, usd: stub.usd } : null;
  }
  if (!claim) notFound();

  return (
    <main className="center">
      <div className="card">
        <p className="muted">{copy.claim.youReceived(claim.senderName)}</p>
        <div className="amount">{formatUsd(claim.usd)}</div>
        <div className="amount-try">≈ {usdToTryIndicative(claim.usd, indicativeRate())}</div>
        <p className="muted" style={{ marginTop: "1.5rem" }}>{copy.claim.amountNote}</p>
        <ClaimButton claimId={claim.id} balanceId={claim.balanceId} />
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: "1rem" }}>{copy.claim.holdHint}</p>
      </div>
    </main>
  );
}
