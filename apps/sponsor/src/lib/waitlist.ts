/**
 * /waitlist — the only PII Lumenia stores (FRONTEND_PLAN §1: notify-me emails).
 * Kept in an ISOLATED store, keyed by list name, NEVER joined to a pubkey or any
 * money data. Reuses the Upstash REST pair (if configured) as a set; falls back to
 * a structured log otherwise. Two lists: "waitlist" and "cashout".
 */
import { kvConfigFromEnv } from "./rate-limit.js";

const LISTS = new Set<string>(["waitlist", "cashout"]);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function saveContact(list: string, email: string): Promise<{ ok: true }> {
  if (!LISTS.has(list)) throw new Error("unknown list");
  const clean = email.trim().toLowerCase();
  if (clean.length > 200 || !EMAIL_RE.test(clean)) throw new Error("invalid email");

  const kv = kvConfigFromEnv();
  if (!kv) {
    // No store configured — log it (isolated: list + email only, never a pubkey).
    console.log(`[contact:${list}] ${clean}`);
    return { ok: true };
  }
  const res = await fetch(`${kv.url}/sadd/lumenia:${list}/${encodeURIComponent(clean)}`, {
    method: "POST",
    headers: { authorization: `Bearer ${kv.token}` },
  });
  if (!res.ok) console.log(`[contact:${list}] ${clean} (store returned ${res.status})`);
  return { ok: true };
}
