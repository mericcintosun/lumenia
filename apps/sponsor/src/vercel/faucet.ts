/**
 * Vercel function source — POST /faucet.
 * Bundled to api/faucet.js (self-contained CJS) by build-vercel.mjs.
 * Testnet test-USDC dispenser — a SEPARATE faucet key, never the sponsor key.
 * 503 when FAUCET_SECRET is unset (faucet disabled).
 */
import {
  getService, applyCors, parseBody, clientIpFrom, enforceRateLimit,
  type VercelReq, type VercelRes,
} from "../lib/service.js";
import { faucetHandler } from "../lib/faucet.js";

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    const { config, faucet, server } = getService();
    if (!faucet) return res.status(503).json({ error: "faucet not configured" });
    const { recipientPublicKey } = parseBody(req.body) as { recipientPublicKey?: string };
    if (!recipientPublicKey) return res.status(400).json({ error: "recipientPublicKey is required" });
    const rl = await enforceRateLimit(clientIpFrom(req.headers), recipientPublicKey);
    if (rl.limited) return res.status(429).json({ error: rl.reason });
    const result = await faucetHandler(server, config, faucet, { recipientPublicKey });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
}
