/**
 * Anti-drain validator — the sponsor's server-side gate, run BEFORE it fee-bumps
 * a client-supplied tx. It lives inside apps/sponsor (not packages/shared) because
 * it is a SPONSOR concern — the web builds the inner tx, only the sponsor validates
 * it — and because the deployed function must bundle it from within its own dir.
 *
 * Not a denylist but an ALLOWLIST: a single unknown op — or an allowed op with an
 * unexpected parameter — = REJECT. This is the sponsor's only defense against
 * draining its reserve + fee. Stellar isolates the *fee* (via fee-bump); we isolate
 * the *reserve* and any value movement. Op-type allowlisting alone is NOT enough:
 * `createAccount(startingBalance > 0)`, `changeTrust` sourced by the sponsor, or a
 * `payment` to an arbitrary destination all drain the sponsor while passing a
 * type-only check. So we validate every op's SOURCE and its sensitive PARAMETERS.
 *
 * Covered by test-antidrain.ts (18/18) — the same file that tests the deployed gate.
 */
import type { Asset, Transaction } from "@stellar/stellar-sdk";

export const ALLOWED_INNER_OP_TYPES = new Set<string>([
  "beginSponsoringFutureReserves",
  "createAccount",
  "changeTrust",
  "endSponsoringFutureReserves",
  "claimClaimableBalance",
  "payment", // only to allow-listed destinations, never sourced by the sponsor
]);

/** Ops the sponsor account is allowed to be the op-source of. Any other
 *  sponsor-sourced op is a drain attempt. */
const SPONSOR_SOURCEABLE_OPS = new Set<string>([
  "beginSponsoringFutureReserves",
  "createAccount",
]);

export interface InnerTxPolicy {
  /** Expected tx source (the recipient account). */
  expectedSource: string;
  /** Sponsor account — pays the fee and may ONLY source begin/createAccount. */
  sponsor: string;
  /**
   * The exact asset `changeTrust` is allowed to add (e.g. USDC).
   * STRICT DEFAULT: if a `changeTrust` op is present and this is omitted, the tx
   * is REJECTED (a forgotten field must fail closed, not silently allow any asset).
   * To intentionally accept any asset, set `allowUncheckedAsset: true`.
   */
  expectedAsset?: Asset;
  /**
   * The exact Claimable Balance id that may be claimed.
   * STRICT DEFAULT: if a `claimClaimableBalance` op is present and this is omitted,
   * the tx is REJECTED. To intentionally accept any balanceId, set
   * `allowUncheckedBalanceId: true`.
   */
  expectedBalanceId?: string;
  /** Escape hatch: allow a `changeTrust` with no `expectedAsset` set (default false). */
  allowUncheckedAsset?: boolean;
  /** Escape hatch: allow a `claimClaimableBalance` with no `expectedBalanceId` set (default false). */
  allowUncheckedBalanceId?: boolean;
  /** Allowed `payment` destinations. If a payment appears and this is omitted/empty, the payment is REJECTED. */
  allowedPaymentDestinations?: Set<string>;
  /** Max `createAccount` startingBalance (default "0" — sponsor funds zero XLM). */
  maxStartingBalance?: string;
  /** Maximum number of ops accepted in a single tx. */
  maxOps?: number;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/** op.source if set, otherwise the tx source (Stellar's default op source). */
function opSource(op: { source?: string }, txSource: string): string {
  return op.source ?? txSource;
}

export function validateInnerTransaction(
  tx: Transaction,
  policy: InnerTxPolicy,
): ValidationResult {
  const maxOps = policy.maxOps ?? 6;
  const maxStarting = Number.parseFloat(policy.maxStartingBalance ?? "0");

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

    const src = opSource(op as { source?: string }, tx.source);

    // Sponsor may only be the source of begin/createAccount. Any other
    // sponsor-sourced op (payment, changeTrust, ...) drains the sponsor.
    if (src === policy.sponsor && !SPONSOR_SOURCEABLE_OPS.has(op.type)) {
      return { ok: false, reason: `op '${op.type}' sourced from sponsor (drain attempt)` };
    }
    // Conversely, begin/createAccount must be sourced by the sponsor; every
    // other op must be sourced by the recipient (expectedSource).
    if (SPONSOR_SOURCEABLE_OPS.has(op.type)) {
      if (src !== policy.sponsor) {
        return { ok: false, reason: `op '${op.type}' must be sourced by the sponsor, got ${src}` };
      }
    } else if (src !== policy.expectedSource) {
      return { ok: false, reason: `op '${op.type}' must be sourced by the recipient, got ${src}` };
    }

    switch (op.type) {
      case "createAccount": {
        const o = op as { destination?: string; startingBalance?: string };
        if (o.destination !== policy.expectedSource) {
          return { ok: false, reason: `createAccount destination ${o.destination} != recipient` };
        }
        if (Number.parseFloat(o.startingBalance ?? "0") > maxStarting) {
          return {
            ok: false,
            reason: `createAccount startingBalance ${o.startingBalance} > max ${maxStarting} (drain attempt)`,
          };
        }
        break;
      }
      case "beginSponsoringFutureReserves": {
        const o = op as { sponsoredId?: string };
        if (o.sponsoredId !== policy.expectedSource) {
          return { ok: false, reason: `beginSponsoring sponsoredId ${o.sponsoredId} != recipient` };
        }
        break;
      }
      case "changeTrust": {
        const o = op as { line?: Asset; limit?: string };
        // Reject liquidity-pool trustlines and any asset other than the expected one.
        if (policy.expectedAsset) {
          const line = o.line;
          if (!line || typeof (line as Asset).equals !== "function" || !policy.expectedAsset.equals(line as Asset)) {
            return { ok: false, reason: "changeTrust asset is not the expected asset" };
          }
        } else if (!policy.allowUncheckedAsset) {
          // Strict default: an unconstrained changeTrust fails closed (a forgotten
          // expectedAsset must not silently sponsor a trustline for any/LP asset).
          return { ok: false, reason: "changeTrust present but no expectedAsset set (strict mode)" };
        }
        break;
      }
      case "claimClaimableBalance": {
        const o = op as { balanceId?: string };
        if (policy.expectedBalanceId) {
          if (o.balanceId !== policy.expectedBalanceId) {
            return { ok: false, reason: `claim balanceId ${o.balanceId} != expected` };
          }
        } else if (!policy.allowUncheckedBalanceId) {
          // Strict default: an unconstrained claim fails closed (a forgotten
          // expectedBalanceId must not let any claimable balance be claimed).
          return { ok: false, reason: "claim present but no expectedBalanceId set (strict mode)" };
        }
        break;
      }
      case "payment": {
        const o = op as { destination?: string };
        // A payment is only allowed to an explicitly allow-listed destination.
        // No allowlist provided → no payment allowed.
        if (
          !policy.allowedPaymentDestinations ||
          policy.allowedPaymentDestinations.size === 0 ||
          !o.destination ||
          !policy.allowedPaymentDestinations.has(o.destination)
        ) {
          return { ok: false, reason: `payment to non-allowlisted destination ${o.destination}` };
        }
        break;
      }
      // endSponsoringFutureReserves: no extra params to check (source already enforced).
    }
  }

  return { ok: true };
}
