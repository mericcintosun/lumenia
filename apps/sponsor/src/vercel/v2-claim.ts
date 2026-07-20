/**
 * Vercel function source — POST /v2-claim (the v2 Soroban LumenDrop claim relayer).
 * Bundled to a self-contained CJS function by build-vercel.mjs.
 */
import {
  getService, applyCors, parseBody, clientIpFrom, enforceRateLimit,
  type VercelReq, type VercelRes,
} from "../lib/service.js";
import { relayClaimHandler } from "../lib/soroban-relay.js";

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    const body = parseBody(req.body);
    const { method, linkHex, payout, sigHex } = body as {
      method?: string;
      linkHex?: string;
      payout?: string;
      sigHex?: string;
    };
    if (!method || !linkHex || !payout || !sigHex) {
      return res.status(400).json({ error: "method, linkHex, payout and sigHex are required" });
    }
    const rl = await enforceRateLimit(clientIpFrom(req.headers), payout);
    if (rl.limited) return res.status(429).json({ error: rl.reason });
    const { config, signer } = getService();
    const result = await relayClaimHandler(config, signer, { method, linkHex, payout, sigHex });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
}
