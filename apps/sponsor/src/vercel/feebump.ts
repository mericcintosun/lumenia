/**
 * Vercel function source — POST /feebump.
 * Bundled to api/feebump.js (self-contained CJS) by build-vercel.mjs.
 * Placeholder until W2: validate (anti-drain) → fee-bump → submit → confirm.
 */
import { applyCors, type VercelReq, type VercelRes } from "../lib/service.js";

export default function handler(req: VercelReq, res: VercelRes): void {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  return res.status(501).json({ error: "not implemented yet (W2)" });
}
