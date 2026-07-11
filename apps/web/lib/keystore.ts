/**
 * Browser keystore — where the account seed lives at rest (FRONTEND_PLAN §2).
 * The seed NEVER leaves this module + lib/signer.ts as plaintext; pages only ever
 * see a public key. A `formatVersion` field lets v2 (passkey/PRF/server-blob
 * recovery) slot in without touching pages.
 *
 *  - Phase 1 ("not locked"): seed wrapped by a NON-EXTRACTABLE WebCrypto AES-GCM key
 *    stored (as a CryptoKey object) in IndexedDB. Not password-grade — anyone with
 *    the device can decrypt. Honest label in the UI.
 *  - Phase 2 ("locked to you"): KEK = Argon2id(password, salt) → AES-256-GCM(seed).
 *    Only {ciphertext, iv, salt, argon params, pubkey} are stored — never the key.
 *
 * All crypto is WebCrypto (AES-GCM) + hash-wasm (Argon2id). No seed is ever logged
 * or sent anywhere.
 */
import type { ArgonParams } from "./argon";

// Argon2id (hash-wasm) is imported DYNAMICALLY inside the Phase-2 functions only,
// so the claim route (which uses Phase 1 = WebCrypto only) never bundles the WASM.
async function deriveKek(password: string, salt: Uint8Array, p: ArgonParams): Promise<Uint8Array> {
  const argon = await import("./argon");
  return argon.deriveKek(password, salt, p);
}

// WebCrypto's BufferSource type (lib.dom, TS 5.7+) is narrower than
// Uint8Array<ArrayBufferLike>; our arrays are always ArrayBuffer-backed at
// runtime, so coerce for the type-checker only.
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

const DB_NAME = "lumenia";
const STORE = "keys";
const RECORD_ID = "primary";

export type Phase = 1 | 2;

export interface KeyRecord {
  id: string;
  formatVersion: 1;
  pubkey: string;
  phase: Phase;
  iv: Uint8Array;
  ciphertext: Uint8Array;
  wrapKey?: CryptoKey; // phase 1 (non-extractable, structured-clone into IDB)
  salt?: Uint8Array; // phase 2
  argon?: ArgonParams; // phase 2
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(record: KeyRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(): Promise<KeyRecord | null> {
  const db = await openDb();
  const record = await new Promise<KeyRecord | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(RECORD_ID);
    req.onsuccess = () => resolve((req.result as KeyRecord) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return record;
}

export async function clearKeystore(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getRecordMeta(): Promise<{ pubkey: string; phase: Phase } | null> {
  const r = await idbGet();
  return r ? { pubkey: r.pubkey, phase: r.phase } : null;
}

/* --------------------------- Phase 1 (device key) --------------------------- */

export async function savePhase1(pubkey: string, seed: Uint8Array): Promise<void> {
  const wrapKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: bs(iv) }, wrapKey, bs(seed)),
  );
  await idbPut({ id: RECORD_ID, formatVersion: 1, pubkey, phase: 1, iv, ciphertext, wrapKey });
}

export async function unlockPhase1(): Promise<Uint8Array> {
  const r = await idbGet();
  if (!r || r.phase !== 1 || !r.wrapKey) throw new Error("no phase-1 key on this device");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bs(r.iv) }, r.wrapKey, bs(r.ciphertext));
  return new Uint8Array(pt);
}

/* ------------------------- Phase 2 (locked to you) -------------------------- */

export async function savePhase2(
  pubkey: string,
  seed: Uint8Array,
  password: string,
  params: ArgonParams,
): Promise<{ deriveMs: number }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const t0 = performance.now();
  const kekBytes = await deriveKek(password, salt, params);
  const deriveMs = performance.now() - t0;
  const kek = await crypto.subtle.importKey("raw", bs(kekBytes), { name: "AES-GCM" }, false, [
    "encrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: bs(iv) }, kek, bs(seed)),
  );
  kekBytes.fill(0);
  await idbPut({ id: RECORD_ID, formatVersion: 1, pubkey, phase: 2, iv, ciphertext, salt, argon: params });
  return { deriveMs };
}

export async function unlockPhase2(password: string): Promise<{ seed: Uint8Array; deriveMs: number }> {
  const r = await idbGet();
  if (!r || r.phase !== 2 || !r.salt || !r.argon) throw new Error("no phase-2 key on this device");
  const t0 = performance.now();
  const kekBytes = await deriveKek(password, r.salt, r.argon);
  const deriveMs = performance.now() - t0;
  const kek = await crypto.subtle.importKey("raw", bs(kekBytes), { name: "AES-GCM" }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bs(r.iv) }, kek, bs(r.ciphertext));
  kekBytes.fill(0);
  return { seed: new Uint8Array(pt), deriveMs };
}
