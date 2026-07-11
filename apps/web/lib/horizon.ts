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

/** The account's USDC balance, or null if the account doesn't exist yet. */
export async function loadBalance(address: string): Promise<Balance | null> {
  try {
    const acc = await server().loadAccount(address);
    const usdc = acc.balances.find(
      (b) => "asset_code" in b && b.asset_code === "USDC",
    ) as { balance: string } | undefined;
    return { usd: usdc?.balance ?? "0" };
  } catch (e) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) return null;
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
