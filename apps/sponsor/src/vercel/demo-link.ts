/**
 * Vercel function source — POST /demo-link.
 * Bundled to api/demo-link.js by build-vercel.mjs. Mints a real testnet demo claim
 * link via the faucet (503 when FAUCET_SECRET is unset). Aggressively rate-limited.
 */
import {
  getService, applyCors, clientIpFrom, enforceRateLimit,
  type VercelReq, type VercelRes,
} from "../lib/service.js";
import { demoLinkHandler } from "../lib/demo-link.js";

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    const { config, faucet, server } = getService();
    if (!faucet) return res.status(503).json({ error: "demo not configured" });
    const rl = await enforceRateLimit(clientIpFrom(req.headers));
    if (rl.limited) return res.status(429).json({ error: rl.reason });
    const result = await demoLinkHandler(server, config, faucet);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
}
