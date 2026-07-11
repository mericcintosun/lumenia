/**
 * Argon2id key derivation in the browser via hash-wasm (FRONTEND_PLAN §9 — NOT the
 * native `argon2` node build, NOT argon2-browser). Derives the KEK that wraps the
 * account seed (Phase 2). Params are tunable so the browser-key-lifecycle spike can
 * find the band that's acceptable on a cheap Android inside the WhatsApp webview
 * (fast enough, no OOM). This module is the only place Argon2id is configured.
 */
import { argon2id } from "hash-wasm";

export interface ArgonParams {
  /** memory cost in MiB */
  memMiB: number;
  /** time cost (iterations) */
  time: number;
  /** lanes / parallelism */
  parallelism: number;
}

/** A mobile-conscious starting point; tuned by the spike on a real device. */
export const DEFAULT_ARGON: ArgonParams = { memMiB: 48, time: 2, parallelism: 1 };

/** Derive a 32-byte key-encryption key from a password + salt. */
export async function deriveKek(
  password: string,
  salt: Uint8Array,
  p: ArgonParams,
): Promise<Uint8Array> {
  return argon2id({
    password,
    salt,
    parallelism: p.parallelism,
    iterations: p.time,
    memorySize: p.memMiB * 1024, // hash-wasm wants KiB
    hashLength: 32,
    outputType: "binary",
  });
}
