/**
 * Vercel function source — POST /events.
 * Bundled to api/events.js (self-contained CJS) by build-vercel.mjs.
 * One structured-log funnel beacon; no PII (see lib/events.ts). Fire-and-forget.
 */
import {
  applyCors, parseBody, clientIpFrom, enforceRateLimit,
  type VercelReq, type VercelRes,
} from "../lib/service.js";
import { handleEvent } from "../lib/events.js";

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    const rl = await enforceRateLimit(clientIpFrom(req.headers));
    if (rl.limited) return res.status(429).json({ error: rl.reason });
    handleEvent(parseBody(req.body) as { event?: string; cid?: string });
  } catch {
    /* ignore an unknown/bad event — the beacon is fire-and-forget */
  }
  return res.status(200).json({ ok: true });
}
