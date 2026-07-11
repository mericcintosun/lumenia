/**
 * Product-analytics beacon (owner caveat C2 — URL hygiene). The payload NEVER
 * contains location.href or the #fragment (the bearer key). Only an allowlisted
 * event name + a HASHED, truncated claim id — enough to measure the claim→first-send
 * funnel, never enough to reconstruct a link. Fire-and-forget; it must never break
 * or delay the claim (all failures swallowed).
 */
const SPONSOR_URL = process.env.NEXT_PUBLIC_SPONSOR_URL ?? "https://lumenia-sponsor.vercel.app";
const ALLOWED = new Set(["claim_opened", "claim_succeeded", "claim_failed"]);

/** Short, non-reversible id for funnel correlation — SHA-256, first 8 bytes. */
async function hashId(id: string): Promise<string> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id));
    return Array.from(new Uint8Array(digest))
      .slice(0, 8)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

export async function sendEvent(event: string, claimId: string): Promise<void> {
  try {
    if (!ALLOWED.has(event)) return;
    if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
    const cid = await hashId(claimId);
    const body = JSON.stringify({ event, cid }); // NEVER url / fragment (C2)
    // text/plain keeps this a "simple" CORS request (no preflight); response ignored.
    navigator.sendBeacon(`${SPONSOR_URL}/events`, new Blob([body], { type: "text/plain" }));
  } catch {
    /* analytics must never break the claim */
  }
}
