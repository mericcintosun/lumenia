/**
 * /create-account — sponsored 0-XLM onboarding.
 *
 * Builds the sponsored-reserve sandwich that gives a brand-new recipient an
 * account + a USDC trustline while they hold 0 XLM (the sponsor covers both
 * reserves and the fee):
 *
 *   beginSponsoringFutureReserves(sponsoredId=recipient)   [source: sponsor]
 *   createAccount(destination=recipient, startingBalance=0) [source: sponsor]
 *   changeTrust(USDC)                                       [source: recipient]
 *   endSponsoringFutureReserves()                           [source: recipient]
 *
 * tx.source = sponsor (the recipient account does not exist yet, so it cannot
 * provide a sequence number). The sponsor pays the fee directly — no fee-bump is
 * needed here (fee-bump is the /feebump claim path, where tx.source = recipient).
 * The sponsor signs its half; the recipient co-signs `changeTrust`+`end` on-device.
 *
 * The sponsor BUILDS this tx itself from a single untrusted input (the recipient
 * public key), so there is nothing client-supplied to anti-drain-validate here;
 * the allowlist validator guards the /feebump path, where the client builds the tx.
 */
import {
  BASE_FEE,
  Operation,
  StrKey,
  TransactionBuilder,
  type Transaction,
  type Horizon,
} from "@stellar/stellar-sdk";
import type { SponsorConfig } from "./config";
import type { SponsorSigner } from "./signer";

export interface CreateAccountInput {
  recipientPublicKey: string;
}

export interface CreateAccountResult {
  /** Sponsor-signed sandwich, base64 XDR. The recipient co-signs, then it is submitted. */
  xdr: string;
  sponsorPublicKey: string;
  network: SponsorConfig["network"];
  /** The USDC asset the trustline was opened to (so the client can verify / build the claim). */
  usdcCode: string;
  usdcIssuer: string;
  /** Ops the recipient must still sign (changeTrust + endSponsoring). */
  recipientMustSign: true;
}

function assertValidRecipient(pub: string): void {
  if (!StrKey.isValidEd25519PublicKey(pub)) {
    throw new Error(`invalid recipientPublicKey: ${pub}`);
  }
}

export async function buildCreateAccountSandwich(
  server: Horizon.Server,
  config: SponsorConfig,
  sponsorPublicKey: string,
  recipientPublicKey: string,
): Promise<Transaction> {
  assertValidRecipient(recipientPublicKey);
  if (recipientPublicKey === sponsorPublicKey) {
    throw new Error("recipient must differ from the sponsor");
  }
  const sponsorAccount = await server.loadAccount(sponsorPublicKey);
  return new TransactionBuilder(sponsorAccount, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      Operation.beginSponsoringFutureReserves({ sponsoredId: recipientPublicKey, source: sponsorPublicKey }),
    )
    .addOperation(
      Operation.createAccount({ destination: recipientPublicKey, startingBalance: "0", source: sponsorPublicKey }),
    )
    .addOperation(Operation.changeTrust({ asset: config.usdc, source: recipientPublicKey }))
    .addOperation(Operation.endSponsoringFutureReserves({ source: recipientPublicKey }))
    .setTimeout(180)
    .build();
}

/**
 * Platform-agnostic handler: (config, signer, input) → sponsor-signed sandwich XDR.
 * Reused by the local node:http server and the Vercel function adapter.
 */
export async function createAccountHandler(
  server: Horizon.Server,
  config: SponsorConfig,
  signer: SponsorSigner,
  input: CreateAccountInput,
): Promise<CreateAccountResult> {
  const tx = await buildCreateAccountSandwich(server, config, signer.publicKey(), input.recipientPublicKey);
  signer.sign(tx);
  return {
    xdr: tx.toXDR(),
    sponsorPublicKey: signer.publicKey(),
    network: config.network,
    usdcCode: config.usdc.getCode(),
    // USDC is always a credit asset (constructed with an issuer), never native.
    usdcIssuer: config.usdc.getIssuer()!,
    recipientMustSign: true,
  };
}
