/**
 * Vercel function source — POST /create-account.
 * Bundled to api/create-account.js (self-contained CJS) by build-vercel.mjs.
 * Delegates to the same core the local node:http server calls (lib/create-account).
 */
import {
  getService, applyCors, parseBody, clientIpFrom, enforceRateLimit,
  type VercelReq, type VercelRes,
} from "../lib/service.js";
import { createAccountHandler } from "../lib/create-account.js";

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    const body = parseBody(req.body);
    const recipientPublicKey = body.recipientPublicKey;
    if (typeof recipientPublicKey !== "string" || !recipientPublicKey) {
      return res.status(400).json({ error: "recipientPublicKey is required" });
    }
    const rl = await enforceRateLimit(clientIpFrom(req.headers), recipientPublicKey);
    if (rl.limited) return res.status(429).json({ error: rl.reason });
    const { config, signer, server, channels } = getService();
    const result = await createAccountHandler(server, config, signer, { recipientPublicKey }, channels);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
}
