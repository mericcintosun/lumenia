/**
 * Client-side Horizon reads for the app shell (FRONTEND_PLAN §0/§9: /home reads
 * straight from Horizon, no proxy, no DB — "status from the ledger, not our
 * server"). Balance + activity are REAL testnet data (no-mock-data rule); an
 * account that doesn't exist yet returns an honest null / empty list.
 */
import { Horizon } from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";

export interface Balance {
  /** USDC balance the recipient holds, as a decimal string. */
  usd: string;
  /** The trustline's issuer — lets other reads pin the exact asset, not just the code. */
  issuer?: string;
}

export interface IncomingClaim {
  balanceId: string;
  usd: string;
  at: string; // ISO timestamp (last modified)
}

export interface ActivityItem {
  id: string;
  direction: "in" | "out";
  usd: string;
  at: string; // ISO timestamp
}

function server(): Horizon.Server {
  return new Horizon.Server(HORIZON_URL);
}

// USDC carries 7 decimals; sum in integer stroops so many small balances add up
// without float drift, then render back to a decimal string.
function usdToStroops(dec: string): bigint {
  const [whole, frac = ""] = dec.split(".");
  const fracPadded = (frac + "0000000").slice(0, 7);
  return BigInt(whole || "0") * 10_000_000n + BigInt(fracPadded || "0");
}
function stroopsToUsd(s: bigint): string {
  const whole = s / 10_000_000n;
  const frac = (s % 10_000_000n).toString().padStart(7, "0");
  return `${whole}.${frac}`;
}

/**
 * ONE total USDC across several accounts — the home account plus any not-yet-swept
 * throwaway accounts (RECOVERY_ARCHITECTURE §3.1). The user always sees a single
 * number; the split into multiple accounts is plumbing, never UI. Returns the total
 * as a decimal string plus the per-account breakdown (so /home can consolidate each
 * throwaway and pin the right trustline issuer). Missing accounts count as 0.
 */
export async function loadTotalUsd(
  addresses: string[],
): Promise<{ usd: string; perAccount: { address: string; usd: string; issuer?: string }[] }> {
  const perAccount = await Promise.all(
    addresses.map(async (address) => {
      const b = await loadBalance(address);
      return { address, usd: b?.usd ?? "0", issuer: b?.issuer };
    }),
  );
  const total = perAccount.reduce((sum, p) => sum + usdToStroops(p.usd), 0n);
  return { usd: stroopsToUsd(total), perAccount };
}

/** The account's USDC balance, or null if the account doesn't exist yet. */
export async function loadBalance(address: string): Promise<Balance | null> {
  try {
    const acc = await server().loadAccount(address);
    const usdc = acc.balances.find(
      (b) => "asset_code" in b && b.asset_code === "USDC",
    ) as { balance: string; asset_issuer?: string } | undefined;
    return { usd: usdc?.balance ?? "0", issuer: usdc?.asset_issuer };
  } catch (e) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) return null;
    throw e;
  }
}

/**
 * Money waiting to be collected: open Claimable Balances where THIS account is an
 * UNCONDITIONAL claimant (a paid request, or any transfer straight to the address).
 * The account's own outgoing sends never match — there it is the reclaim claimant,
 * whose predicate is time-locked, not unconditional. Pinned to the account's own
 * trustline asset (code + issuer), so a look-alike token can't pose as money.
 *
 * Horizon's claimant filter matches CBs where the address is ANY claimant, so the
 * account's own open outgoing sends occupy page rows before the client-side
 * filter runs. limit(200) is Horizon's max page; an active sender's open links
 * can no longer bury a genuinely-waiting payment behind a 20-row page. Residual:
 * beyond 200 open rows (deliberate dust-spam) needs pagination — noted, not built.
 */
export async function loadIncomingClaims(address: string, issuer: string): Promise<IncomingClaim[]> {
  try {
    const page = await server().claimableBalances().claimant(address).limit(200).order("desc").call();
    return page.records
      .filter((cb) => {
        const mine = cb.claimants.find((c) => c.destination === address);
        return (
          cb.asset === `USDC:${issuer}` &&
          (mine?.predicate as { unconditional?: boolean } | undefined)?.unconditional === true
        );
      })
      .map((cb) => ({
        balanceId: cb.id,
        usd: cb.amount,
        at: (cb as unknown as { last_modified_time?: string }).last_modified_time ?? "",
      }));
  } catch (e) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) return [];
    throw e;
  }
}

/**
 * A public transfer record by its transaction hash (for /tools/verify). Returns
 * null if there's no such transaction. Plain "was it real + when", no jargon.
 */
export async function loadTransfer(
  hash: string,
): Promise<{ successful: boolean; createdAt: string } | null> {
  try {
    const tx = await server().transactions().transaction(hash).call();
    return { successful: tx.successful, createdAt: tx.created_at };
  } catch (e) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) return null;
    throw e;
  }
}

/**
 * A sent link's status straight from the ledger (FRONTEND_PLAN §1: /sent status =
 * Horizon reads on the claimable-balance id — no DB). "pending" = the balance still
 * exists (waiting to be claimed); "settled" = it's gone (claimed by the recipient,
 * or reclaimed by the sender after 7 days).
 */
export async function loadLinkStatus(balanceId: string): Promise<"pending" | "settled"> {
  try {
    await server().claimableBalances().claimableBalance(balanceId).call();
    return "pending";
  } catch (e) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) return "settled";
    throw e;
  }
}

/** Money in/out for the account, newest first — derived from ledger effects. */
export async function loadActivity(address: string, limit = 20): Promise<ActivityItem[]> {
  try {
    const page = await server().effects().forAccount(address).order("desc").limit(limit).call();
    return page.records
      .filter(
        (e) =>
          (e.type === "account_credited" || e.type === "account_debited") &&
          (e as { asset_code?: string }).asset_code === "USDC",
      )
      .map((e) => ({
        id: e.id,
        direction: e.type === "account_credited" ? ("in" as const) : ("out" as const),
        usd: (e as { amount: string }).amount,
        at: (e as { created_at: string }).created_at,
      }));
  } catch (e) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) return [];
    throw e;
  }
}
