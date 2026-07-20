/**
 * /v2-claim — the v2 (Soroban) claim relayer. The recipient's link key signs a payout off-chain;
 * this endpoint SUBMITS the LumenDrop `claim` / `claim_share` and pays the Soroban fee, so the
 * recipient is walletless + gasless. Mirrors the fee-bump relayer, but for a Soroban invoke.
 *
 * Safety is enforced BY THE CONTRACT (auditable bytecode): the escrow only releases the deposited
 * USDC to the address the link key signed — the relayer can NEVER redirect a stroop (proven on-chain,
 * 7/7). So the sponsor's guard here is minimal + tight: only the KNOWN LumenDrop contract, only the
 * two claim methods, valid 32-byte link + 64-byte sig. The sponsor sources the tx (pays fees) and
 * can never lose value — it holds no USDC in this path.
 */
import { rpc, Address, Contract, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import type { SponsorConfig } from "./config.js";
import type { SponsorSigner } from "./signer.js";

const ALLOWED_METHODS = new Set<string>(["claim", "claim_share"]);

export interface RelayClaimInput {
  /** LumenDrop method: "claim" (one-to-one) or "claim_share" (group). */
  method: string;
  /** The link's Ed25519 public key as 32-byte hex (the drop id). */
  linkHex: string;
  /** The payout account (G… or C…) the link key signed for. */
  payout: string;
  /** The 64-byte Ed25519 signature as hex. */
  sigHex: string;
}

export interface RelayClaimResult {
  hash: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function relayClaimHandler(
  config: SponsorConfig,
  signer: SponsorSigner,
  input: RelayClaimInput,
): Promise<RelayClaimResult> {
  if (!config.lumendropContract) throw new Error("v2 relayer not configured (LUMENDROP_CONTRACT unset)");
  if (!ALLOWED_METHODS.has(input.method)) throw new Error(`method not allowed: ${input.method}`);

  const link = Buffer.from(input.linkHex, "hex");
  const sig = Buffer.from(input.sigHex, "hex");
  if (link.length !== 32) throw new Error("link must be 32 bytes (hex)");
  if (sig.length !== 64) throw new Error("sig must be 64 bytes (hex)");
  // Address.fromString throws on a malformed payout — reject before spending a simulation.
  const payoutScVal = Address.fromString(input.payout).toScVal();

  const server = new rpc.Server(config.sorobanRpcUrl);
  const source = await server.getAccount(signer.publicKey());
  const tx = new TransactionBuilder(source, { fee: "1000000", networkPassphrase: config.networkPassphrase })
    .addOperation(
      new Contract(config.lumendropContract).call(
        input.method,
        xdr.ScVal.scvBytes(link),
        payoutScVal,
        xdr.ScVal.scvBytes(sig),
      ),
    )
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`v2-claim simulation failed: ${sim.error}`);
  const prepared = rpc.assembleTransaction(tx, sim).build();
  signer.sign(prepared);

  const sent = await server.sendTransaction(prepared);
  if (sent.status === "ERROR") throw new Error(`v2-claim send failed: ${JSON.stringify(sent.errorResult)}`);
  let got = await server.getTransaction(sent.hash);
  for (let i = 0; i < 40 && got.status === "NOT_FOUND"; i++) {
    await sleep(1500);
    got = await server.getTransaction(sent.hash);
  }
  if (got.status !== "SUCCESS") throw new Error(`v2-claim tx ${got.status}`);
  return { hash: sent.hash };
}
