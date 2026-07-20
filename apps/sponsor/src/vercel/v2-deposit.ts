/**
 * Vercel function source — POST /v2-deposit (gasless v2 deposit relayer: fee-bump the sender-signed
 * LumenDrop deposit). Bundled to a self-contained CJS function by build-vercel.mjs.
 */
import {
  getService, applyCors, parseBody, clientIpFrom, enforceRateLimit,
  type VercelReq, type VercelRes,
} from "../lib/service.js";
import { relayDepositHandler } from "../lib/soroban-relay.js";

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    const body = parseBody(req.body);
    const { xdr, senderPublicKey } = body as { xdr?: string; senderPublicKey?: string };
    if (!xdr || !senderPublicKey) return res.status(400).json({ error: "xdr and senderPublicKey are required" });
    const rl = await enforceRateLimit(clientIpFrom(req.headers), senderPublicKey);
    if (rl.limited) return res.status(429).json({ error: rl.reason });
    const { config, signer } = getService();
    const result = await relayDepositHandler(config, signer, { xdr, senderPublicKey });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
}
