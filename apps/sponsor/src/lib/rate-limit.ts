/**
 * Rate limiting — per-IP and per-account token buckets (SOW D1 hardening).
 *
 * SCOPE NOTE: this is in-memory / per-instance. On serverless it protects against
 * bursts that hit a warm instance (the realistic drain-by-spam vector and the
 * integration test). Durable cross-instance limiting (Vercel KV / Upstash) is the
 * mainnet upgrade — the SOW explicitly puts "abuse-at-scale handling" out of scope
 * for this testnet sprint. Fee-abuse is also bounded structurally: the fee cap in
 * /feebump means each accepted request costs the sponsor a fixed, tiny maximum.
 */

interface Bucket {
  tokens: number;
  ts: number;
}

/** A token-bucket keyed store: `true` = this request is over the limit. */
function makeBucketStore() {
  const buckets = new Map<string, Bucket>();
  return function limited(key: string, cap: number, windowMs: number, now: number): boolean {
    const b = buckets.get(key) ?? { tokens: cap, ts: now };
    const refill = ((now - b.ts) / windowMs) * cap;
    b.tokens = Math.min(cap, b.tokens + refill);
    b.ts = now;
    if (b.tokens < 1) {
      buckets.set(key, b);
      return true;
    }
    b.tokens -= 1;
    buckets.set(key, b);
    return false;
  };
}

const ipStore = makeBucketStore();
const accountStore = makeBucketStore();

export interface RateLimitConfig {
  ipCap: number;
  ipWindowMs: number;
  accountCap: number;
  accountWindowMs: number;
}

export function rateLimitConfigFromEnv(): RateLimitConfig {
  const int = (name: string, fallback: number) => {
    const v = process.env[name];
    const n = v ? Number.parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    ipCap: int("RATE_CAP", 30),
    ipWindowMs: int("RATE_WINDOW_MS", 60_000),
    accountCap: int("ACCOUNT_RATE_CAP", 5),
    accountWindowMs: int("ACCOUNT_RATE_WINDOW_MS", 60_000),
  };
}

export interface RateLimitVerdict {
  limited: boolean;
  reason?: string;
}

/** Enforce per-IP then per-account limits. `account` is the recipient pubkey (if known). */
export function checkRateLimit(
  ip: string,
  account: string | undefined,
  cfg: RateLimitConfig,
  now: number,
): RateLimitVerdict {
  if (ipStore(`ip:${ip}`, cfg.ipCap, cfg.ipWindowMs, now)) {
    return { limited: true, reason: "per-IP rate limit exceeded" };
  }
  if (account && accountStore(`acct:${account}`, cfg.accountCap, cfg.accountWindowMs, now)) {
    return { limited: true, reason: "per-account rate limit exceeded" };
  }
  return { limited: false };
}
