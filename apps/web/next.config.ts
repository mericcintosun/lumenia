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
};

export default nextConfig;
