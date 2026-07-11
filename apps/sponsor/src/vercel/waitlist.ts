/**
 * Vercel function source — POST /waitlist.
 * Bundled to api/waitlist.js by build-vercel.mjs. Stores a notify-me email in an
 * isolated list (lib/waitlist.ts) — never joined to any money data.
 */
import {
  applyCors, parseBody, clientIpFrom, enforceRateLimit,
  type VercelReq, type VercelRes,
} from "../lib/service.js";
import { saveContact } from "../lib/waitlist.js";

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    const rl = await enforceRateLimit(clientIpFrom(req.headers));
    if (rl.limited) return res.status(429).json({ error: rl.reason });
    const { list, email } = parseBody(req.body) as { list?: string; email?: string };
    if (!list || !email) return res.status(400).json({ error: "list and email are required" });
    await saveContact(list, email);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
}
