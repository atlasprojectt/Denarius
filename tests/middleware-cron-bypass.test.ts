import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "@/middleware";

// Regression test for issue #17: Vercel Cron never carries a Supabase session
// cookie, so the session-redirect check must never reach /api/cron/* — it has
// its own CRON_SECRET authorization inside the route handler. Before this fix,
// every cron request was silently redirected to /login (307) and the daily
// sync never ran. The bypass short-circuits before any Supabase call, so this
// test needs no network mocking.
describe("middleware — cron routes bypass the session redirect", () => {
  it("does not redirect an unauthenticated /api/cron/* request to /login", async () => {
    const request = new NextRequest("http://localhost/api/cron/sync");
    const response = await middleware(request);
    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  it("still redirects an unauthenticated request to a normal app route", async () => {
    const request = new NextRequest("http://localhost/explorar");
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });
});
