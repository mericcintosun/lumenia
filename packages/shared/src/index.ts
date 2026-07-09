/**
 * @lumenia/shared — primitives genuinely shared by the web + sponsor service:
 * the USDC asset helper, the bearer claim-secret, and shared types.
 *
 * NOTE: the anti-drain validator is NOT here — it is a SERVER-SIDE (sponsor) gate,
 * so it lives in apps/sponsor/src/lib/anti-drain.ts (inside the deploy boundary).
 * The web builds the claim tx; only the sponsor validates it.
 */
import { createHash, randomBytes } from "node:crypto";
import { Asset } from "@stellar/stellar-sdk";

/* ------------------------------------------------------------------ */
/* Asset & network configuration                                      */
/* ------------------------------------------------------------------ */

/** native Circle USDC (mainnet). On testnet use your own test issuer. */
export const USDC_MAINNET_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

export function usdc(issuer: string): Asset {
  return new Asset("USDC", issuer);
}

/* ------------------------------------------------------------------ */
/* Claim secret (bearer token in the link)                            */
/* ------------------------------------------------------------------ */

/** High-entropy secret (≥128-bit) to be placed in the link's fragment. */
export function generateClaimSecret(): string {
  return randomBytes(16).toString("base64url");
}

/** ONLY its hash is stored on the server — the plaintext secret is never written to the DB. */
export function hashClaimSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type StellarNetwork = "testnet" | "mainnet";

export interface ClaimLink {
  /** hash(claimSecret) — the plaintext secret is never stored. */
  secretHash: string;
  /** Claimable Balance id (on the Stellar ledger). */
  balanceId: string;
  senderAddress: string;
  asset: "USDC";
  amount: string;
  status: "pending" | "claimed" | "reclaimed" | "expired";
  expiresAt: string;
}
