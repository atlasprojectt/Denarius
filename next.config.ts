import type { NextConfig } from "next";

import { STATIC_SECURITY_HEADERS } from "./lib/security/headers";

/**
 * Origins allowed to submit Server Actions (issue #60). This app's ENTIRE
 * mutation surface is server actions — there is no REST layer and no API route
 * but the two crons — so Next's origin check IS the CSRF boundary here.
 *
 * Next compares the request's `Origin` against the `Host` it was served on and
 * rejects a mismatch; that default already covers the production deployment,
 * where both are the same host. This list is the deliberate statement of which
 * OTHER origins may post: today only the production alias, so a preview
 * deployment can never drive a mutation against production. It grows when #56
 * lands the real domain.
 */
const SERVER_ACTION_ORIGINS = ["denarius-nine.vercel.app"];

const nextConfig: NextConfig = {
  // Playwright and the in-app browser use the loopback host while developers
  // commonly open localhost. Next 16 rejects dev chunks when these aliases are
  // not declared, leaving the server-rendered UI visible but unhydrated.
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // Next 16.3 appends a managed block to AGENTS.md and CLAUDE.md on `next dev`.
  // Both are the project constitution and a locked file under PARALLEL.md §3 —
  // a dev server must not rewrite them, in any worktree.
  agentRules: false,

  // Next's file tracer cannot infer the Brotli archives that
  // @sparticuz/chromium decompresses at runtime. Include them in both PDF
  // route functions or production will fail before Chromium can launch.
  outputFileTracingIncludes: {
    "/api/relatorios/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },

  experimental: {
    serverActions: {
      allowedOrigins: SERVER_ACTION_ORIGINS,
      // Leave room for multipart boundaries while the avatar schema caps the
      // actual image at 3 MB.
      bodySizeLimit: "4mb",
    },
  },

  // The request-independent half of the security headers (issue #60). They live
  // here rather than in proxy.ts so they also cover /_next/static and the other
  // asset paths the proxy matcher deliberately skips. The Content-Security-Policy
  // is NOT here: it carries a per-request nonce and is set by proxy.ts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: Object.entries(STATIC_SECURITY_HEADERS).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
  },
};

export default nextConfig;
