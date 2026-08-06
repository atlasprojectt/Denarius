import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

// Regression test for issue #60. When Supabase refreshes an expiring session it
// calls `setAll`, which writes the new cookie into request.cookies — and the
// SSR pattern then rebuilds the response so the RENDER sees it, not just the
// browser. Adding the CSP nonce to the forwarded request headers introduced a
// snapshot taken before that write, which silently disabled the forwarding:
// the browser got the refreshed cookie, but the page it rendered still read the
// expired one.
//
// Supabase is mocked rather than env-gated (the other proxy cases skip without
// NEXT_PUBLIC_SUPABASE_*): the refresh callback is the whole subject here, and
// a case that never runs in CI would not have caught this.

const REFRESHED = "sb-access-token=REFRESHED";

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        setAll(
          cookies: { name: string; value: string; options?: unknown }[],
        ): void;
      };
    },
  ) => ({
    auth: {
      getUser: async () => {
        // What the real client does on an expiring token.
        options.cookies.setAll([
          { name: "sb-access-token", value: "REFRESHED", options: {} },
        ]);
        return { data: { user: { id: "user-1" } } };
      },
    },
  }),
}));

import { proxy } from "@/proxy";

/** The headers Next forwards to the render, as encoded on the response. */
function forwardedHeader(response: Response, name: string): string | null {
  return response.headers.get(`x-middleware-request-${name}`);
}

describe("proxy — a refreshed session cookie reaches the render", () => {
  it("forwards the NEW cookie, not the expired one it arrived with", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/", {
        headers: { cookie: "sb-access-token=EXPIRED" },
      }),
    );

    expect(forwardedHeader(response, "cookie")).toContain("REFRESHED");
    expect(forwardedHeader(response, "cookie")).not.toContain("EXPIRED");
    // The browser still gets it too — that half was never broken.
    expect(response.headers.get("set-cookie")).toContain(REFRESHED);
  });

  it("still forwards the CSP nonce alongside the refreshed cookie", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/", {
        headers: { cookie: "sb-access-token=EXPIRED" },
      }),
    );

    // Both concerns ride the same forwarded headers: losing either one breaks
    // the app (no nonce → Next's own scripts are blocked by script-src).
    const forwardedCsp = forwardedHeader(response, "content-security-policy");
    expect(forwardedCsp).toContain("nonce-");
    expect(forwardedCsp).toBe(response.headers.get("Content-Security-Policy"));
  });
});
