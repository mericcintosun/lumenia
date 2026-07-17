/**
 * Thin Horizon helpers shared by the sponsor endpoints and the CLI.
 */
import { Horizon, xdr } from "@stellar/stellar-sdk";
import type { SponsorConfig } from "./config";

/**
 * The Claimable Balance id created by a transaction, read from ITS OWN result XDR
 * (Horizon's hex id string). This is the unambiguous source — a "newest CB where X
 * is a claimant" Horizon query races against concurrent txs. Handles the fee-bump
 * wrapper (fee-bumped submits put the inner tx's op results one level down) and a
 * plain (unwrapped) result. Returns null on any shape surprise so the caller can
 * fall back rather than fail a tx that already succeeded.
 */
export function createdBalanceIdFromResult(resultXdr: string, opIndex: number): string | null {
  if (opIndex < 0) return null;
  try {
    const top = xdr.TransactionResult.fromXDR(resultXdr, "base64").result();
    const inner = top.switch().name.startsWith("txFeeBumpInner")
      ? top.innerResultPair().result().result()
      : top;
    const op = inner.results()[opIndex];
    if (!op) return null;
    return op.tr().createClaimableBalanceResult().balanceId().toXDR("hex");
  } catch {
    return null;
  }
}

export function horizon(config: SponsorConfig): Horizon.Server {
  return new Horizon.Server(config.horizonUrl);
}

/** Submit a tx, surfacing Horizon's `extras` (the useful part) on failure. */
export async function submit(
  server: Horizon.Server,
  tx: Parameters<Horizon.Server["submitTransaction"]>[0],
): Promise<{ hash: string; ledger: number; resultXdr?: string }> {
  try {
    const res = await server.submitTransaction(tx);
    // result_xdr names exactly what THIS tx did (e.g. the created CB id) — callers
    // that need an id must read it from here, not from a "newest matching entry"
    // Horizon query, which races against concurrent txs.
    return { hash: res.hash, ledger: res.ledger, resultXdr: (res as { result_xdr?: string }).result_xdr };
  } catch (e: unknown) {
    const extras = (e as { response?: { data?: { extras?: unknown } } })?.response?.data?.extras;
    const detail = extras ? JSON.stringify(extras) : (e as Error).message;
    throw new Error(`submit failed: ${detail}`);
  }
}

export async function nativeBalance(server: Horizon.Server, pub: string): Promise<string> {
  const acc = await server.loadAccount(pub);
  return acc.balances.find((b) => b.asset_type === "native")?.balance ?? "0";
}

export async function trustlineBalance(
  server: Horizon.Server,
  pub: string,
  code: string,
  issuer: string,
): Promise<string> {
  const acc = await server.loadAccount(pub);
  const line = acc.balances.find(
    (b) => "asset_code" in b && b.asset_code === code && "asset_issuer" in b && b.asset_issuer === issuer,
  );
  return line ? line.balance : "NO_TRUSTLINE";
}

export async function friendbot(pub: string): Promise<void> {
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(pub)}`);
  if (!res.ok) throw new Error(`friendbot failed for ${pub}: ${res.status}`);
}
