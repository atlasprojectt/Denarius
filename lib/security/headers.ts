// Denarius — HTTP security headers (pure, no I/O), issue #60.
//
// Two layers, split by what each can do:
//   - STATIC_SECURITY_HEADERS are request-independent and are served by
//     next.config.ts `headers()`, so they also cover /_next/static assets the
//     proxy matcher deliberately skips.
//   - The Content-Security-Policy is per-request (it carries a fresh nonce) and
//     is therefore built here and applied by proxy.ts.
//
// The policy's whole point is that `script-src` carries no 'unsafe-inline' —
// a policy that admits it stops nothing an attacker would attempt. Two
// mechanisms replace it: a per-request NONCE (Next reads the incoming CSP and
// stamps its own bootstrap/flight scripts with it) and one HASH for the static
// no-FOUC theme script, which also runs from the Client-Component global-error
// boundary where no nonce can be read. `style-src` is the documented exception
// — see STYLE_SRC_NOTE.

// Relative, not the "@/" alias: next.config.ts imports this module through its
// own loader, which does not resolve tsconfig paths.
import { THEME_SCRIPT_SHA256 } from "../theme-script";

/** Request-independent headers. Applied to every response, assets included. */
export const STATIC_SECURITY_HEADERS: Record<string, string> = {
  // Two years + preload: the app is HTTPS-only on Vercel, and a downgrade is
  // the cheapest way to strip everything below.
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  // Full URL to same-origin, bare origin cross-origin: an app path can carry a
  // team id, and a referred third party has no business receiving it.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Denarius reads no device and takes no payment. Denying the lot is the
  // honest expression of that.
  "Permissions-Policy":
    "accelerometer=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
};

/**
 * Why `style-src` keeps 'unsafe-inline' while `script-src` does not.
 *
 * Every bar in the app is painted by an inline `style` object from lib/bars.ts
 * (a per-layer mask image plus a clip-path cut), Recharts writes inline styles
 * on the plot as the pointer moves, and Next injects inline `<style>` for the
 * critical CSS. A nonce cannot reach a React `style` prop at all — the browser
 * applies it as an attribute, and attribute styles are what 'unsafe-inline'
 * governs. Hashing is equally impossible: the widths are data-dependent.
 *
 * The two directives are not equally dangerous. Injected script runs with the
 * page's full authority — reads the session, calls the API, exfiltrates. An
 * injected style can restyle and, at worst, mislead; it cannot execute. So the
 * looseness is confined to the directive where it costs least and is stated
 * here rather than left for a reader to infer.
 */
export const STYLE_SRC_NOTE =
  "style-src allows inline styles: bar geometry (lib/bars.ts), Recharts and Next's critical CSS are attribute styles, which no nonce or hash can cover.";

/** The origin of a URL, or null when it is absent or unparseable. */
export function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export type CspOptions = {
  /** Supabase project origin — the one cross-origin fetch the browser makes. */
  supabaseOrigin?: string | null;
  /** Dev needs 'unsafe-eval' for React Refresh; production must never have it. */
  dev?: boolean;
};

/**
 * The Content-Security-Policy for one request. `nonce` is minted per request and
 * is what lets Next's own bootstrap/flight scripts and the inline theme script
 * run without 'unsafe-inline'.
 */
export function buildCsp(nonce: string, options: CspOptions = {}): string {
  const { supabaseOrigin = null, dev = false } = options;

  const scriptSrc = ["'self'", `'nonce-${nonce}'`, `'${THEME_SCRIPT_SHA256}'`];
  // React Refresh compiles modules with eval in dev only. Gated so a production
  // build cannot inherit it by accident.
  if (dev) scriptSrc.push("'unsafe-eval'");

  const connectSrc = ["'self'"];
  if (supabaseOrigin) connectSrc.push(supabaseOrigin);
  // The dev server's HMR socket.
  if (dev) connectSrc.push("ws:");

  const directives: string[][] = [
    ["default-src", "'self'"],
    ["script-src", ...scriptSrc],
    ["style-src", "'self'", "'unsafe-inline'"],
    // next/font self-hosts every face at build time — no font CDN.
    ["font-src", "'self'", "data:"],
    ["img-src", "'self'", "data:", "blob:"],
    ["connect-src", ...connectSrc],
    // Clickjacking: the app is never framed, and never frames anything.
    ["frame-ancestors", "'none'"],
    ["frame-src", "'none'"],
    ["object-src", "'none'"],
    // Server actions post to this origin; nothing else may be a form target.
    ["form-action", "'self'"],
    ["base-uri", "'self'"],
  ];
  if (!dev) directives.push(["upgrade-insecure-requests"]);

  return directives.map((parts) => parts.join(" ")).join("; ");
}

/** 16 random bytes, base64 — the CSP nonce format browsers expect. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Paths a search engine may index. Everything else is a signed-in surface of a
 * named company's budget data: "there is a login" is not the same as telling a
 * crawler not to try (issue #60).
 */
export const INDEXABLE_PREFIXES = ["/login", "/privacidade", "/termos"];

export function isIndexable(pathname: string): boolean {
  return INDEXABLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
