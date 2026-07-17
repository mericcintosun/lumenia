/**
 * /feedback — "report a problem" inbox. Free-text product feedback, stored in an
 * ISOLATED Upstash list (never joined to a pubkey or any money data), mirroring
 * the /waitlist isolation posture. The contact field is optional and
 * user-volunteered — the product never requires it. Falls back to a structured
 * log when no KV store is configured.
 */
import { kvConfigFromEnv } from "./rate-limit.js";

/** Where in the product the report came from — an allowlist, not a free string. */
const CATEGORIES = new Set<string>(["claim", "send", "request", "money", "site", "other"]);

const MAX_MESSAGE = 500;
const MAX_CONTACT = 200;
const STORE_KEY = "lumenia:feedback:v1";
/** Newest entries kept; the list is capped so an abuse burst can never grow the
 *  shared KV store unbounded (it also backs the rate limiter + waitlist). */
const MAX_ENTRIES = 2000;

/** Strip terminal/markup-hostile control chars (keep \n and \t) — these entries
 *  are read by a human in a terminal or dashboard later. */
function sanitize(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export interface FeedbackInput {
  category?: string;
  message?: string;
  contact?: string;
}

export async function saveFeedback(input: FeedbackInput): Promise<{ ok: true }> {
  const category = (input.category ?? "").trim().toLowerCase();
  if (!CATEGORIES.has(category)) throw new Error("unknown category");

  const message = sanitize((input.message ?? "").trim());
  if (message.length === 0) throw new Error("message is required");
  if (message.length > MAX_MESSAGE) throw new Error(`message too long (max ${MAX_MESSAGE})`);

  const contact = sanitize((input.contact ?? "").trim());
  if (contact.length > MAX_CONTACT) throw new Error(`contact too long (max ${MAX_CONTACT})`);

  const entry = JSON.stringify({
    category,
    message,
    ...(contact ? { contact } : {}),
    at: new Date().toISOString(),
  });

  const kv = kvConfigFromEnv();
  if (!kv) {
    // No store configured — log it (isolated: never a pubkey, never money data).
    console.log(`[feedback:${category}] ${entry}`);
    return { ok: true };
  }
  const res = await fetch(`${kv.url}/rpush/${STORE_KEY}/${encodeURIComponent(entry)}`, {
    method: "POST",
    headers: { authorization: `Bearer ${kv.token}` },
  });
  if (!res.ok) {
    console.log(`[feedback:${category}] ${entry} (store returned ${res.status})`);
  } else {
    // Cap the list at the newest MAX_ENTRIES so growth stays bounded.
    await fetch(`${kv.url}/ltrim/${STORE_KEY}/-${MAX_ENTRIES}/-1`, {
      method: "POST",
      headers: { authorization: `Bearer ${kv.token}` },
    }).catch(() => {});
  }
  return { ok: true };
}
