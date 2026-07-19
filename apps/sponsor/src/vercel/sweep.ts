/**
 * Vercel function source — POST /sweep.
 * Bundled to a self-contained CJS function by build-vercel.mjs.
 * SWEEP anti-drain validate → fee-bump → submit (same core as the node:http server).
 */
import {
  getService, applyCors, parseBody, clientIpFrom, enforceRateLimit,
  type VercelReq, type VercelRes,
} from "../lib/service.js";
import { sweepHandler } from "../lib/sweep.js";

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    const body = parseBody(req.body);
    const { xdr, throwawayPublicKey, homePublicKey, balanceId, amount } = body as {
      xdr?: string;
      throwawayPublicKey?: string;
      homePublicKey?: string;
      balanceId?: string;
      amount?: string;
    };
    if (!xdr || !throwawayPublicKey || !homePublicKey || !amount) {
      return res
        .status(400)
        .json({ error: "xdr, throwawayPublicKey, homePublicKey and amount are required (balanceId optional)" });
    }
    const rl = await enforceRateLimit(clientIpFrom(req.headers), throwawayPublicKey);
    if (rl.limited) return res.status(429).json({ error: rl.reason });
    const { config, signer, server } = getService();
    const result = await sweepHandler(server, config, signer, {
      xdr,
      throwawayPublicKey,
      homePublicKey,
      balanceId,
      amount,
    });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
}
