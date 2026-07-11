/**
 * Bootstrap the test-USDC faucet (a SEPARATE key from the sponsor — FRONTEND_PLAN §3).
 * Creates a fresh faucet account, funds it (friendbot), opens the USDC trustline, and
 * has the issuer mint a pool of test-USDC into it. Prints FAUCET_SECRET/PUBLIC — set
 * FAUCET_SECRET as a Vercel env on the sponsor to enable POST /faucet. Testnet only.
 *
 *   RUN:  USDC_ISSUER_SECRET=S... pnpm --filter @lumenia/sponsor faucet-bootstrap
 */
import { Asset, BASE_FEE, Horizon, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { friendbot, submit } from "../lib/stellar.js";

const NETWORK = Networks.TESTNET;
const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const POOL = "100000"; // pre-mint 100k test-USDC into the faucet

async function main() {
  const issuerSecret = process.env.USDC_ISSUER_SECRET;
  if (!issuerSecret) throw new Error("set USDC_ISSUER_SECRET (the sponsor's USDC issuer)");
  const issuer = Keypair.fromSecret(issuerSecret);
  const USDC = new Asset("USDC", issuer.publicKey());
  const faucet = Keypair.random();

  console.log("[1] friendbot-fund the faucet account");
  await friendbot(faucet.publicKey());

  console.log("[2] open the USDC trustline on the faucet");
  {
    const acc = await server.loadAccount(faucet.publicKey());
    const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.changeTrust({ asset: USDC }))
      .setTimeout(180)
      .build();
    tx.sign(faucet);
    await submit(server, tx);
  }

  console.log(`[3] issuer mints ${POOL} test-USDC into the faucet`);
  {
    const acc = await server.loadAccount(issuer.publicKey());
    const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(Operation.payment({ destination: faucet.publicKey(), asset: USDC, amount: POOL }))
      .setTimeout(180)
      .build();
    tx.sign(issuer);
    await submit(server, tx);
  }

  console.log("\n============================================================");
  console.log(" ✅ FAUCET READY — set FAUCET_SECRET on the sponsor (Vercel env)");
  console.log("============================================================");
  console.log(`FAUCET_SECRET=${faucet.secret()}`);
  console.log(`FAUCET_PUBLIC=${faucet.publicKey()}`);
  console.log(`(pool: ${POOL} test-USDC)`);
}

main().catch((e) => {
  console.error("\n💥 faucet-bootstrap failed:", (e as Error).message);
  process.exit(1);
});
