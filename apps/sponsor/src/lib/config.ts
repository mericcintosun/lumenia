/**
 * Sponsor service configuration.
 *
 * The sponsor is a SEPARATE service holding a hot Ed25519 signing key (its own
 * env/IAM boundary — never a Next API route). For the Instawards testnet sprint
 * the signer is an env hot-key; a KMS raw-signer drops in behind the same
 * `SponsorSigner` seam (see lib/signer.ts, proven mechanically by Spike #1b).
 */
import { Asset, Networks } from "@stellar/stellar-sdk";

export type StellarNetwork = "testnet" | "mainnet";

export interface SponsorConfig {
  network: StellarNetwork;
  networkPassphrase: string;
  horizonUrl: string;
  /** Hot sponsor secret (S...). KMS key id replaces this later — see lib/signer.ts. */
  sponsorSecret: string;
  /**
   * Test-USDC faucet secret (S...) — a SEPARATE key from the sponsor (two blast
   * radii). Optional: if unset, the /faucet endpoint is disabled. Testnet only.
   */
  faucetSecret?: string;
  /** The one USDC asset the sponsor will open a trustline to. */
  usdc: Asset;
  /** Hard cap (stroops) on the fee the sponsor will pay for a single fee-bump. */
  feeBumpMaxStroops: string;
  port: number;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing required env: ${name}`);
  return v;
}

export function passphraseFor(network: StellarNetwork): string {
  return network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
}

export function defaultHorizon(network: StellarNetwork): string {
  return network === "mainnet" ? "https://horizon.stellar.org" : "https://horizon-testnet.stellar.org";
}

/** Build a config from explicit parts (used by the CLI when bootstrapping a demo). */
export function makeConfig(parts: {
  network: StellarNetwork;
  sponsorSecret: string;
  faucetSecret?: string;
  usdcIssuer: string;
  usdcCode?: string;
  horizonUrl?: string;
  feeBumpMaxStroops?: string;
  port?: number;
}): SponsorConfig {
  const network = parts.network;
  return {
    network,
    networkPassphrase: passphraseFor(network),
    horizonUrl: parts.horizonUrl ?? defaultHorizon(network),
    sponsorSecret: parts.sponsorSecret,
    faucetSecret: parts.faucetSecret,
    usdc: new Asset(parts.usdcCode ?? "USDC", parts.usdcIssuer),
    feeBumpMaxStroops: parts.feeBumpMaxStroops ?? "10000", // 0.001 XLM per tx
    port: parts.port ?? 8787,
  };
}

/** Load config from the environment (used by the deployed HTTP service). */
export function loadConfig(): SponsorConfig {
  const network = (process.env.STELLAR_NETWORK as StellarNetwork) ?? "testnet";
  if (network !== "testnet" && network !== "mainnet") {
    throw new Error(`STELLAR_NETWORK must be 'testnet' or 'mainnet', got '${network}'`);
  }
  return makeConfig({
    network,
    sponsorSecret: required("SPONSOR_SECRET"),
    faucetSecret: process.env.FAUCET_SECRET,
    usdcIssuer: required("USDC_ISSUER"),
    usdcCode: process.env.USDC_CODE,
    horizonUrl: process.env.HORIZON_URL,
    feeBumpMaxStroops: process.env.FEE_BUMP_MAX_STROOPS,
    port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : undefined,
  });
}
