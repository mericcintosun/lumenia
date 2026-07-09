/**
 * Bootstrap a testnet sponsor + USDC issuer (friendbot-funded) and print the
 * env vars the sponsor service needs. For local dev and the testnet deployment's
 * one-time key generation.
 *
 *   pnpm --filter @lumenia/sponsor bootstrap
 *   # then paste SPONSOR_SECRET + USDC_ISSUER into .env (or the deploy env)
 */
import { Keypair } from "@stellar/stellar-sdk";
import { friendbot } from "../lib/stellar.js";

async function main() {
  const sponsor = Keypair.random();
  const issuer = Keypair.random();
  await Promise.all([friendbot(sponsor.publicKey()), friendbot(issuer.publicKey())]);
  // machine-readable (grep-able) lines
  console.log(`SPONSOR_SECRET=${sponsor.secret()}`);
  console.log(`SPONSOR_PUBLIC=${sponsor.publicKey()}`);
  console.log(`USDC_ISSUER=${issuer.publicKey()}`);
}

main().catch((e) => {
  console.error("bootstrap failed:", (e as Error).message);
  process.exit(1);
});
