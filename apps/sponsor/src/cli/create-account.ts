/**
 * CLI driver for /create-account (Instawards SOW, Week 1 milestone).
 *
 * Self-contained testnet demo: bootstraps a fresh sponsor + USDC issuer via
 * friendbot, generates a NEW recipient (never funded), runs the sponsor's
 * create-account handler, co-signs as the recipient on-device, submits, and
 * prints a verifiable tx hash — a sponsored 0-XLM account with a USDC trustline.
 *
 * This exercises the exact core the deployed HTTP service calls (lib/create-account),
 * with the CLI standing in for the recipient's on-device key + the submit step.
 *
 *   RUN (in-process): pnpm --filter @lumenia/sponsor create-account
 *   RUN (live HTTP):  pnpm --filter @lumenia/sponsor create-account -- --url http://localhost:8787
 *   NEEDS: internet (Horizon testnet + friendbot). Testnet only, no real money.
 */
import { Horizon, Keypair, TransactionBuilder, type Transaction } from "@stellar/stellar-sdk";
import { makeConfig, passphraseFor, defaultHorizon } from "../lib/config.js";
import { signerFromSecret } from "../lib/signer.js";
import { horizon, submit, friendbot, nativeBalance, trustlineBalance } from "../lib/stellar.js";
import { createAccountHandler, type CreateAccountResult } from "../lib/create-account.js";

const EXPLORER = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;

function urlArg(): string | undefined {
  const i = process.argv.indexOf("--url");
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** In URL mode, get the sponsored sandwich XDR from the live service over HTTP. */
async function viaHttp(baseUrl: string, recipientPublicKey: string): Promise<CreateAccountResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/create-account`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recipientPublicKey }),
  });
  if (!res.ok) throw new Error(`sponsor /create-account → ${res.status}: ${await res.text()}`);
  return (await res.json()) as CreateAccountResult;
}

async function main() {
  const baseUrl = urlArg();
  console.log("============================================================");
  console.log(` CLI — /create-account (${baseUrl ? `live HTTP: ${baseUrl}` : "in-process handler"})`);
  console.log("============================================================\n");

  // In-process mode bootstraps its own sponsor+issuer; HTTP mode uses the server's.
  let getResult: (recipientPublicKey: string) => Promise<CreateAccountResult>;
  let networkPassphrase: string;

  if (baseUrl) {
    networkPassphrase = passphraseFor("testnet");
    getResult = (pk) => viaHttp(baseUrl, pk);
  } else {
    console.log("[1] bootstrap a testnet sponsor + USDC issuer (friendbot)");
    const sponsor = Keypair.random();
    const issuer = Keypair.random();
    await Promise.all([friendbot(sponsor.publicKey()), friendbot(issuer.publicKey())]);
    console.log(`   sponsor: ${sponsor.publicKey()}`);
    console.log(`   issuer:  ${issuer.publicKey()} (USDC)`);
    const config = makeConfig({ network: "testnet", sponsorSecret: sponsor.secret(), usdcIssuer: issuer.publicKey() });
    const server = horizon(config);
    const signer = signerFromSecret(config.sponsorSecret);
    networkPassphrase = config.networkPassphrase;
    getResult = (pk) => createAccountHandler(server, config, signer, { recipientPublicKey: pk });
  }

  const verifyServer = new Horizon.Server(defaultHorizon("testnet"));

  console.log("\n[2] new recipient (never funded)");
  const recipient = Keypair.random();
  console.log(`   recipient: ${recipient.publicKey()}`);

  console.log("\n[3] SPONSOR: build + sign the create-account sandwich");
  const result = await getResult(recipient.publicKey());
  console.log(`   sponsor: ${result.sponsorPublicKey}`);
  console.log(`   USDC issuer: ${result.usdcIssuer}`);
  console.log(`   sponsor-signed XDR: ${result.xdr.length} chars (recipient must co-sign)`);

  console.log("\n[4] RECIPIENT: co-sign changeTrust + endSponsoring on-device → submit");
  const tx = TransactionBuilder.fromXDR(result.xdr, networkPassphrase) as Transaction;
  tx.sign(recipient);
  const { hash, ledger } = await submit(verifyServer, tx);
  console.log(`   ✔ submitted in ledger ${ledger}`);

  console.log("\n[5] verify the recipient state on-ledger");
  const xlm = await nativeBalance(verifyServer, recipient.publicKey());
  const usdc = await trustlineBalance(verifyServer, recipient.publicKey(), result.usdcCode, result.usdcIssuer);

  const ok = xlm === "0.0000000" && usdc === "0.0000000";
  console.log(`   recipient XLM:  ${xlm}  (expect 0.0000000)`);
  console.log(`   recipient USDC: ${usdc}  (expect 0.0000000 trustline open)`);

  console.log("\n============================================================");
  console.log(ok ? " ✅ CREATE-ACCOUNT PASS" : " ❌ CREATE-ACCOUNT FAIL");
  console.log("============================================================");
  console.log(` tx hash:  ${hash}`);
  console.log(` explorer: ${EXPLORER(hash)}`);
  console.log("\n A brand-new account exists, holds 0 XLM, and has a USDC trustline —");
  console.log(" all reserves + the fee were paid by the sponsor.");
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error("\n💥 create-account CLI failed:", (e as Error).message);
  process.exit(1);
});
