/**
 * SponsorSigner seam — the sponsor's signing capability, abstracted so the hot
 * env key (this sprint) and an external KMS raw-signer (later) are drop-in
 * interchangeable. The rest of the service never touches a raw secret.
 *
 * The KMS path is already proven mechanically by Spike #1b: raw-sign the 32-byte
 * tx hash with Ed25519, then build a Stellar DecoratedSignature whose hint is the
 * last 4 bytes of the public key. `KmsSponsorSigner` (future) implements exactly
 * that against `@aws-sdk/client-kms` — the interface below is identical.
 */
import { Keypair, type Transaction, type FeeBumpTransaction } from "@stellar/stellar-sdk";

export interface SponsorSigner {
  /** The sponsor's public account address (G...). */
  publicKey(): string;
  /** Add the sponsor's signature to a tx (mutates it in place). */
  sign(tx: Transaction | FeeBumpTransaction): void;
}

/** Env hot-key signer: wraps a local Ed25519 Keypair (S...). Testnet-sprint default. */
export class EnvKeypairSigner implements SponsorSigner {
  private readonly kp: Keypair;

  constructor(secret: string) {
    this.kp = Keypair.fromSecret(secret);
  }

  publicKey(): string {
    return this.kp.publicKey();
  }

  sign(tx: Transaction | FeeBumpTransaction): void {
    tx.sign(this.kp);
  }
}

export function signerFromSecret(secret: string): SponsorSigner {
  return new EnvKeypairSigner(secret);
}
