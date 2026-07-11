import type { NextConfig } from "next";
import path from "node:path";

// PWA service worker (Serwist) is deferred (not in the NOW scope).
const nextConfig: NextConfig = {
  // LOCAL ONLY: this is a pnpm workspace whose node_modules is hoisted to the repo
  // root, so Turbopack's root must be the repo root (else the symlinked `next`
  // resolves outside an apps/web root and the build fails). On Vercel the web
  // project uploads apps/web standalone with real deps — the default inference is
  // correct there (it is how prod already builds), so we must NOT override it.
  ...(process.env.VERCEL
    ? {}
    : { turbopack: { root: path.resolve(import.meta.dirname, "..", "..") } }),

  // The OG route reads the embedded font from ./assets via fs at runtime — make
  // sure that file is traced into the serverless function bundle on Vercel.
  outputFileTracingIncludes: {
    "/c/**": ["./assets/**"],
  },

  // The bearer key rides in the #fragment (never sent to a server), but the claim
  // route must also not leak its full URL via the Referer header to the sponsor,
  // the explorer, or any third party. Cover the page and its /og sub-path.
  async headers() {
    return [
      {
        source: "/c/:id",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/c/:id/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
