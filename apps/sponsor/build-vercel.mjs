/**
 * Bundle the Vercel function sources (src/vercel/*.ts) into self-contained CJS
 * files in api/. Bundling with esbuild resolves the @stellar/stellar-sdk ESM ⇄
 * @stellar/js-xdr `config` CJS interop at build time, so the deployed functions
 * have NO runtime module resolution (which is what breaks under Vercel's plain
 * Node ESM loader). Run by Vercel's buildCommand (see vercel.json).
 */
import { build } from "esbuild";
import { rmSync, mkdirSync, writeFileSync } from "node:fs";

rmSync("api", { recursive: true, force: true });
mkdirSync("api", { recursive: true });

await build({
  entryPoints: {
    health: "src/vercel/health.ts",
    "create-account": "src/vercel/create-account.ts",
    feebump: "src/vercel/feebump.ts",
    "send-link": "src/vercel/send-link.ts",
    faucet: "src/vercel/faucet.ts",
    "demo-link": "src/vercel/demo-link.ts",
    waitlist: "src/vercel/waitlist.ts",
    events: "src/vercel/events.ts",
  },
  outdir: "api",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  logLevel: "warning",
});

// api/*.js are CJS bundles. The package root is type:module, so mark this dir as
// CommonJS explicitly (nearest package.json wins) — Node + Vercel load them as CJS.
writeFileSync("api/package.json", JSON.stringify({ type: "commonjs" }, null, 2) + "\n");

// This is a functions-only project, but Vercel's buildCommand still expects a
// static output directory — emit a minimal one.
mkdirSync("public", { recursive: true });
writeFileSync(
  "public/index.html",
  '<!doctype html><meta charset="utf-8"><title>Lumenia sponsor</title>' +
    "<p>Lumenia sponsor service (testnet). Health: <a href=\"/health\">/health</a>.</p>\n",
);
console.log("✔ built self-contained CJS functions in api/ (health, create-account, feebump, send-link, faucet, demo-link, waitlist, events)");
