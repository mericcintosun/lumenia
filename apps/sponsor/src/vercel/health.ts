/**
 * Vercel function source — GET /health.
 * Bundled to api/health.js (self-contained CJS) by build-vercel.mjs.
 */
import { getService, applyCors, type VercelReq, type VercelRes } from "../lib/service.js";

export default function handler(req: VercelReq, res: VercelRes): void {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  const { config, signer } = getService();
  return res.status(200).json({
    ok: true,
    service: "lumenia-sponsor",
    network: config.network,
    sponsorPublicKey: signer.publicKey(),
    usdcCode: config.usdc.getCode(),
    usdcIssuer: config.usdc.getIssuer(),
  });
}
