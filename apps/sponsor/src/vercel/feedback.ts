/**
 * Vercel function source — POST /feedback.
 * Bundled to api/feedback.js by build-vercel.mjs. Stores a "report a problem"
 * entry in an isolated list (lib/feedback.ts) — never joined to any money data.
 */
import {
  applyCors, parseBody, clientIpFrom, enforceRateLimit,
  type VercelReq, type VercelRes,
} from "../lib/service.js";
import { saveFeedback } from "../lib/feedback.js";

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    // Own limiter bucket ("fb:" prefix) — decoupled from the money-path per-IP
    // window in both directions (see the /feedback route in src/index.ts).
    const rl = await enforceRateLimit(`fb:${clientIpFrom(req.headers)}`);
    if (rl.limited) return res.status(429).json({ error: rl.reason });
    const { category, message, contact } = parseBody(req.body) as {
      category?: string; message?: string; contact?: string;
    };
    await saveFeedback({ category, message, contact });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
}
