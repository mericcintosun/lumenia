/**
 * Signer abstraction (architecture-review condition #1).
 *
 * Everything that signs goes through this ONE interface. v1 uses a classic
 * Ed25519 key unlocked by biometric/password; v2 swaps in an OZ passkey
 * smart-account signer — WITHOUT changing the claim flow or the account
 * address (see ./account.ts). The rest of the app must never know which
 * concrete signer is in use.
 */
import { Buffer } from "buffer";
import { Keypair, type Transaction } from "@stellar/stellar-sdk";

export interface Signer {
  /** Stellar public key (G...) of the account this signer controls. */
  publicKey(): string;
  /** Sign a transaction and return it (mutated/clone) ready to submit. */
  sign(tx: Transaction): Promise<Transaction>;
  /** Which concrete backend — for diagnostics only, never for control flow. */
  readonly kind: "local-ed25519" | "kms" | "passkey-smart-account";
}

/**
 * v1 local Ed25519 signer from a seed already in hand. The WalletProvider produces
 * the seed transiently (Phase-1 keystore decrypt at signing time, wiped after; or a
 * Phase-2 session seed held in memory) and asserts the derived public key matches
 * the stored account address before returning the signer (lib/wallet.tsx::getSigner).
 * The seed never leaves that module + this one. v2 swaps in a passkey smart-account
 * signer WITHOUT changing this interface or the account address (./account.ts is
 * address-stable).
 */
export function localSignerFromSeed(seed: Uint8Array): Signer {
  const kp = Keypair.fromRawEd25519Seed(Buffer.from(seed));
  return {
    kind: "local-ed25519",
    publicKey: () => kp.publicKey(),
    sign: async (tx) => {
      tx.sign(kp);
      return tx;
    },
  };
}
