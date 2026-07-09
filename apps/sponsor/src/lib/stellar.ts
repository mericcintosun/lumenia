/**
 * Thin Horizon helpers shared by the sponsor endpoints and the CLI.
 */
import { Horizon } from "@stellar/stellar-sdk";
import type { SponsorConfig } from "./config";

export function horizon(config: SponsorConfig): Horizon.Server {
  return new Horizon.Server(config.horizonUrl);
}

/** Submit a tx, surfacing Horizon's `extras` (the useful part) on failure. */
export async function submit(
  server: Horizon.Server,
  tx: Parameters<Horizon.Server["submitTransaction"]>[0],
): Promise<{ hash: string; ledger: number }> {
  try {
    const res = await server.submitTransaction(tx);
    return { hash: res.hash, ledger: res.ledger };
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
