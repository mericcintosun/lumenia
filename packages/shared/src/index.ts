/**
 * @lumenia/shared — primitives shared by the web + sponsor service.
 * (tx-build, claim-secret, anti-drain validation, types)
 *
 * CRITICAL: the claim tx is seen by both web (builds the inner tx) and sponsor
 * (re-validate + fee-bump); both must import from here so they run byte-for-byte identical logic.
 */
import { createHash, randomBytes } from "node:crypto";
import { Asset, Transaction } from "@stellar/stellar-sdk";

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
/* Anti-drain validation (sponsor calls this BEFORE fee-bump)          */
/* ------------------------------------------------------------------ */

/**
 * The inner tx the sponsor will sign/fee-bump must contain only the expected
 * ops. Not a denylist but an ALLOWLIST: a single unknown op = REJECT.
 * This prevents a malicious inner tx from draining the sponsor's reserve.
 */
export const ALLOWED_INNER_OP_TYPES = new Set<string>([
  "beginSponsoringFutureReserves",
  "createAccount",
  "changeTrust",
  "endSponsoringFutureReserves",
  "claimClaimableBalance",
  "payment", // only to allowed destinations (checked below)
]);

export interface InnerTxPolicy {
  /** Expected tx source (recipient account). */
  expectedSource: string;
  /** Sponsor account — may be the fee-source but cannot spend funds as an op-source. */
  sponsor: string;
  /** Allowed payment destinations (e.g. only a known CB/anchor). */
  allowedPaymentDestinations?: Set<string>;
  /** Maximum number of ops accepted in a single tx. */
  maxOps?: number;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateInnerTransaction(
  tx: Transaction,
  policy: InnerTxPolicy,
): ValidationResult {
  const maxOps = policy.maxOps ?? 6;

  if (tx.operations.length === 0) {
    return { ok: false, reason: "no operations" };
  }
  if (tx.operations.length > maxOps) {
    return { ok: false, reason: `too many ops (${tx.operations.length} > ${maxOps})` };
  }
  if (tx.source !== policy.expectedSource) {
    return { ok: false, reason: `unexpected tx source ${tx.source}` };
  }

  for (const op of tx.operations) {
    if (!ALLOWED_INNER_OP_TYPES.has(op.type)) {
      return { ok: false, reason: `disallowed op type: ${op.type}` };
    }

    // Prevent funds from leaving the sponsor's account.
    if ("source" in op && op.source === policy.sponsor && op.type === "payment") {
      return { ok: false, reason: "payment sourced from sponsor account (drain attempt)" };
    }

    // if there is a payment, its destination must be on the allowlist.
    if (op.type === "payment") {
      const dest = (op as { destination?: string }).destination;
      if (
        policy.allowedPaymentDestinations &&
        (!dest || !policy.allowedPaymentDestinations.has(dest))
      ) {
        return { ok: false, reason: `payment to non-allowlisted destination ${dest}` };
      }
    }
  }

  return { ok: true };
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
