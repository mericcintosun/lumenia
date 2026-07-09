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
 * adapter (api/*) when deployed. Rate-limiting here is an in-memory skeleton for
 * the testnet sprint; W3 moves it to a durable store (Vercel KV / Upstash).
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { loadConfig } from "./lib/config";
import { signerFromSecret } from "./lib/signer";
import { horizon } from "./lib/stellar";
import { createAccountHandler } from "./lib/create-account";

const config = loadConfig();
const signer = signerFromSecret(config.sponsorSecret);
const server = horizon(config);
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";

/* ------------------------- tiny per-IP rate limiter ------------------------ */
/* Token bucket: RATE_CAP requests per RATE_WINDOW_MS, refilled continuously.
   In-memory (per instance) — a W3 hardening item promotes this to a shared store. */
const RATE_CAP = Number.parseInt(process.env.RATE_CAP ?? "30", 10);
const RATE_WINDOW_MS = Number.parseInt(process.env.RATE_WINDOW_MS ?? "60000", 10);
const buckets = new Map<string, { tokens: number; ts: number }>();

function rateLimited(ip: string, now: number): boolean {
  const b = buckets.get(ip) ?? { tokens: RATE_CAP, ts: now };
  const refill = ((now - b.ts) / RATE_WINDOW_MS) * RATE_CAP;
  b.tokens = Math.min(RATE_CAP, b.tokens + refill);
  b.ts = now;
  if (b.tokens < 1) {
    buckets.set(ip, b);
    return true;
  }
  b.tokens -= 1;
  buckets.set(ip, b);
  return false;
}

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
  const now = Date.now();
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

  if (rateLimited(clientIp(req), now)) {
    return send(res, 429, { error: "rate limited" });
  }

  try {
    if (method === "POST" && url === "/create-account") {
      const body = (await readJson(req)) as { recipientPublicKey?: string };
      if (!body.recipientPublicKey) return send(res, 400, { error: "recipientPublicKey is required" });
      const result = await createAccountHandler(server, config, signer, {
        recipientPublicKey: body.recipientPublicKey,
      });
      return send(res, 200, result);
    }

    if (method === "POST" && url === "/feebump") {
      return send(res, 501, { error: "not implemented yet (W2)" });
    }

    return send(res, 404, { error: "not found" });
  } catch (e) {
    return send(res, 400, { error: (e as Error).message });
  }
});

httpServer.listen(config.port, () => {
  console.log(`lumenia-sponsor listening on :${config.port} (${config.network}, sponsor ${signer.publicKey()})`);
});
