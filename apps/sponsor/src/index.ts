/**
 * Sponsor HTTP service (Instawards SOW, D1).
 *
 * A standalone Node service holding the hot sponsor key — its own env/IAM
 * boundary, deliberately NOT a Next API route. Endpoints:
 *
 *   GET  /health          → liveness + public sponsor identity (no secrets)
 *   POST /create-account  → sponsored 0-XLM account + USDC trustline (sponsor-signed XDR)
 *   POST /feebump         → validate (anti-drain) + fee-bump + submit the claim  [W2]
 *
 * The request handlers live in lib/* and are platform-agnostic, so the same core
 * runs behind this node:http server (local dev + CLI) and behind a Vercel function
 * adapter (api/*) when deployed. Per-IP + per-account rate limiting and the fee cap
 * are enforced on both paths (lib/rate-limit.ts); durable cross-instance limiting
 * (Vercel KV) is the mainnet upgrade — see ANTI_DRAIN.md.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { getService, enforceRateLimit } from "./lib/service.js";
import { createAccountHandler } from "./lib/create-account.js";
import { feebumpHandler } from "./lib/feebump.js";
import { handleEvent } from "./lib/events.js";

const { config, signer, server } = getService();
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";

/* ------------------------------- helpers ---------------------------------- */
function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(json);
}

async function readJson(req: IncomingMessage, limitBytes = 4096): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limitBytes) throw new Error("request body too large");
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function clientIp(req: IncomingMessage): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
  return req.socket.remoteAddress ?? "unknown";
}

/* -------------------------------- router ---------------------------------- */
const httpServer = createServer(async (req, res) => {
  const method = req.method ?? "GET";
  const url = (req.url ?? "/").split("?")[0];

  if (method === "OPTIONS") return send(res, 204, {});

  if (method === "GET" && url === "/health") {
    return send(res, 200, {
      ok: true,
      service: "lumenia-sponsor",
      network: config.network,
      sponsorPublicKey: signer.publicKey(),
      usdcCode: config.usdc.getCode(),
      usdcIssuer: config.usdc.getIssuer(),
    });
  }

  try {
    if (method === "POST" && url === "/create-account") {
      const body = (await readJson(req)) as { recipientPublicKey?: string };
      if (!body.recipientPublicKey) return send(res, 400, { error: "recipientPublicKey is required" });
      const rl = await enforceRateLimit(clientIp(req), body.recipientPublicKey);
      if (rl.limited) return send(res, 429, { error: rl.reason });
      const result = await createAccountHandler(server, config, signer, {
        recipientPublicKey: body.recipientPublicKey,
      });
      return send(res, 200, result);
    }

    if (method === "POST" && url === "/feebump") {
      const body = (await readJson(req)) as { xdr?: string; recipientPublicKey?: string; balanceId?: string };
      if (!body.xdr || !body.recipientPublicKey || !body.balanceId) {
        return send(res, 400, { error: "xdr, recipientPublicKey and balanceId are required" });
      }
      const rl = await enforceRateLimit(clientIp(req), body.recipientPublicKey);
      if (rl.limited) return send(res, 429, { error: rl.reason });
      const result = await feebumpHandler(server, config, signer, {
        xdr: body.xdr,
        recipientPublicKey: body.recipientPublicKey,
        balanceId: body.balanceId,
      });
      return send(res, 200, result);
    }

    if (method === "POST" && url === "/events") {
      const rl = await enforceRateLimit(clientIp(req));
      if (rl.limited) return send(res, 429, { error: rl.reason });
      try {
        handleEvent((await readJson(req)) as { event?: string; cid?: string });
      } catch {
        /* ignore an unknown/bad event — the beacon is fire-and-forget */
      }
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: "not found" });
  } catch (e) {
    return send(res, 400, { error: (e as Error).message });
  }
});

httpServer.listen(config.port, () => {
  console.log(`lumenia-sponsor listening on :${config.port} (${config.network}, sponsor ${signer.publicKey()})`);
});
