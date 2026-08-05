import { createHash } from "node:crypto";

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import nextConfig from "@/next.config";
import { proxy } from "@/proxy";
import {
  buildCsp,
  createNonce,
  isIndexable,
  originOf,
  STATIC_SECURITY_HEADERS,
} from "@/lib/security/headers";
import { THEME_SCRIPT, THEME_SCRIPT_SHA256 } from "@/lib/theme-script";

// Issue #60. The app shipped with no security headers at all; these assert the
// critical ones exist and, above all, that script-src never regains
// 'unsafe-inline' — the single line that would turn the policy into decoration.

function directive(csp: string, name: string): string {
  const found = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
  if (!found) throw new Error(`CSP has no "${name}" directive: ${csp}`);
  return found;
}

describe("buildCsp", () => {
  const csp = buildCsp("test-nonce", {
    supabaseOrigin: "https://project.supabase.co",
  });

  it("never admits inline script", () => {
    expect(directive(csp, "script-src")).not.toContain("unsafe-inline");
    expect(directive(csp, "script-src")).toContain("'nonce-test-nonce'");
  });

  it("keeps eval out of a production policy", () => {
    expect(csp).not.toContain("unsafe-eval");
    expect(buildCsp("n", { dev: true })).toContain("unsafe-eval");
  });

  it("blocks framing, plugins and foreign form targets", () => {
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(directive(csp, "form-action")).toBe("form-action 'self'");
    expect(directive(csp, "base-uri")).toBe("base-uri 'self'");
  });

  it("allows the browser to reach Supabase and nothing else cross-origin", () => {
    expect(directive(csp, "connect-src")).toBe(
      "connect-src 'self' https://project.supabase.co",
    );
    expect(directive(buildCsp("n", { supabaseOrigin: null }), "connect-src")).toBe(
      "connect-src 'self'",
    );
  });

  it("keeps inline STYLE deliberately, and only style", () => {
    // Documented in STYLE_SRC_NOTE: bar geometry and Recharts write attribute
    // styles, which no nonce or hash can cover. The looseness stops here.
    expect(directive(csp, "style-src")).toContain("'unsafe-inline'");
    expect(directive(csp, "img-src")).not.toContain("'unsafe-inline'");
    expect(directive(csp, "font-src")).not.toContain("'unsafe-inline'");
  });
});

describe("the theme-script hash", () => {
  it("matches the script it is supposed to admit", () => {
    // The hash is hardcoded (the policy is built per request in the edge
    // runtime, where hashing is async). This is the guard that keeps editing
    // the script without editing the hash from reaching production as a
    // silently blocked no-FOUC script.
    const actual = createHash("sha256").update(THEME_SCRIPT, "utf8").digest("base64");
    expect(THEME_SCRIPT_SHA256).toBe(`sha256-${actual}`);
    expect(buildCsp("n")).toContain(`'${THEME_SCRIPT_SHA256}'`);
  });
});

describe("createNonce", () => {
  it("is unpredictable per request", () => {
    const nonces = new Set(Array.from({ length: 50 }, () => createNonce()));
    expect(nonces.size).toBe(50);
  });
});

describe("originOf", () => {
  it("reduces a Supabase URL to its origin and survives a missing value", () => {
    expect(originOf("https://abc.supabase.co/rest/v1")).toBe("https://abc.supabase.co");
    expect(originOf(undefined)).toBeNull();
    expect(originOf("not a url")).toBeNull();
  });
});

describe("isIndexable", () => {
  it("covers the public legal pages and nothing behind the login", () => {
    expect(isIndexable("/privacidade")).toBe(true);
    expect(isIndexable("/termos")).toBe(true);
    expect(isIndexable("/login")).toBe(true);
    for (const path of ["/", "/times", "/times/abc", "/explorar", "/ajustes"]) {
      expect(isIndexable(path), path).toBe(false);
    }
    // Prefix matching must not leak: a route merely starting with the letters
    // of a public one is still an app route.
    expect(isIndexable("/loginha")).toBe(false);
  });
});

describe("next.config headers()", () => {
  it("serves the request-independent headers on every path", async () => {
    const rules = await nextConfig.headers!();
    const applied = rules.find((rule) => rule.source === "/:path*");
    expect(applied).toBeDefined();
    const byKey = Object.fromEntries(
      applied!.headers.map((h) => [h.key, h.value]),
    );
    expect(byKey).toEqual(STATIC_SECURITY_HEADERS);
    expect(byKey["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("states the server-action origin allow-list deliberately", () => {
    // Every mutation in this app is a server action, so Next's origin check is
    // the CSRF boundary. An empty/absent list would leave that unstated.
    expect(nextConfig.experimental?.serverActions?.allowedOrigins).toEqual([
      "denarius-nine.vercel.app",
    ]);
  });
});

describe("proxy — security headers on the response", () => {
  it("stamps the cron bypass, which never reaches the session path", async () => {
    const response = await proxy(new NextRequest("http://localhost/api/cron/sync"));
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  // The session path builds a Supabase client, so this case only runs where
  // that env exists (local dev) — same gate as tests/proxy-cron-bypass.test.ts.
  it.skipIf(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )("leaves a public page indexable while still stamping the policy", async () => {
    const response = await proxy(new NextRequest("http://localhost/login"));
    expect(response.headers.get("X-Robots-Tag")).toBeNull();
    expect(response.headers.get("Content-Security-Policy")).not.toBeNull();
  });

  it("mints a fresh nonce per request", async () => {
    const first = await proxy(new NextRequest("http://localhost/api/cron/sync"));
    const second = await proxy(new NextRequest("http://localhost/api/cron/sync"));
    expect(first.headers.get("Content-Security-Policy")).not.toBe(
      second.headers.get("Content-Security-Policy"),
    );
  });
});
