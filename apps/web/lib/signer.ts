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
 * v1 local Ed25519 signer. The account's public key is known up-front (stored as
 * data — see ./account.ts, address-stable), while the 32-byte seed is produced
 * transiently by `unlock` (a keystore decrypt) only at signing time and wiped
 * afterwards. The seed never leaves this function. v2 swaps in a passkey
 * smart-account signer WITHOUT changing this interface or the account address.
 */
export function createLocalSigner(publicKey: string, unlock: () => Promise<Uint8Array>): Signer {
  return {
    kind: "local-ed25519",
    publicKey: () => publicKey,
    sign: async (tx) => {
      const seed = await unlock();
      try {
        const kp = Keypair.fromRawEd25519Seed(Buffer.from(seed));
        if (kp.publicKey() !== publicKey) {
          throw new Error("unlocked key does not match this account");
        }
        tx.sign(kp);
        return tx;
      } finally {
        seed.fill(0); // best-effort wipe of the transient seed
      }
    },
  };
}

/** Direct seed → signer (used by the key-lifecycle spike; the seed is already in hand). */
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
