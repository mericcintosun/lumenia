/**
 * Vercel function source — POST /send-link.
 * Bundled to api/send-link.js (self-contained CJS) by build-vercel.mjs.
 * Send anti-drain validate → sponsor signs the inner (begin) → fee-bump → submit →
 * return the created Claimable Balance id (same core as the node:http server).
 */
import {
  getService, applyCors, parseBody, clientIpFrom, enforceRateLimit,
  type VercelReq, type VercelRes,
} from "../lib/service.js";
import { sendLinkHandler } from "../lib/send.js";

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    const { xdr, senderPublicKey } = parseBody(req.body) as { xdr?: string; senderPublicKey?: string };
    if (!xdr || !senderPublicKey) {
      return res.status(400).json({ error: "xdr and senderPublicKey are required" });
    }
    const rl = await enforceRateLimit(clientIpFrom(req.headers), senderPublicKey);
    if (rl.limited) return res.status(429).json({ error: rl.reason });
    const { config, signer, server } = getService();
    const result = await sendLinkHandler(server, config, signer, { xdr, senderPublicKey });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
}
