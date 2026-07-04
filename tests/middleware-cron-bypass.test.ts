import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "@/middleware";

// The session-redirect path builds a Supabase client (NEXT_PUBLIC_SUPABASE_*),
// so the "normal route still redirects" case only runs where that env exists
// (local dev); CI has no Supabase env and skips it, matching the rls/roster
// integration tests. The cron-bypass case needs no env — it short-circuits
// before any Supabase call — so it always runs.
const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Regression test for issue #17: Vercel Cron never carries a Supabase session
// cookie, so the session-redirect check must never reach /api/cron/* — it has
// its own CRON_SECRET authorization inside the route handler. Before this fix,
// every cron request was silently redirected to /login (307) and the daily
// sync never ran.
describe("middleware — cron routes bypass the session redirect", () => {
  it("does not redirect an unauthenticated /api/cron/* request to /login", async () => {
    const request = new NextRequest("http://localhost/api/cron/sync");
    const response = await middleware(request);
    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  it.skipIf(!hasSupabaseEnv)(
    "still redirects an unauthenticated request to a normal app route",
    async () => {
      const request = new NextRequest("http://localhost/explorar");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    },
  );
});
