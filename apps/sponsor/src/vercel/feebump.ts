/**
 * Vercel function source — POST /feebump.
 * Bundled to api/feebump.js (self-contained CJS) by build-vercel.mjs.
 * Anti-drain validate → fee-bump → submit → confirm (same core as the node:http server).
 */
import {
  getService, applyCors, parseBody, clientIpFrom, enforceRateLimit,
  type VercelReq, type VercelRes,
} from "../lib/service.js";
import { feebumpHandler } from "../lib/feebump.js";

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    const body = parseBody(req.body);
    const { xdr, recipientPublicKey, balanceId } = body as {
      xdr?: string;
      recipientPublicKey?: string;
      balanceId?: string;
    };
    if (!xdr || !recipientPublicKey || !balanceId) {
      return res.status(400).json({ error: "xdr, recipientPublicKey and balanceId are required" });
    }
    const rl = await enforceRateLimit(clientIpFrom(req.headers), recipientPublicKey);
    if (rl.limited) return res.status(429).json({ error: rl.reason });
    const { config, signer, server } = getService();
    const result = await feebumpHandler(server, config, signer, { xdr, recipientPublicKey, balanceId });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
}
