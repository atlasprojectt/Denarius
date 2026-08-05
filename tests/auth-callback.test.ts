import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Issue #68 — the auth callback. This route is the ENTRY POINT of the recovery
// grant: the cookie it stamps here is the only thing that separates "arrived
// through the e-mail link" from "holds any live session", which is the whole
// defence on `/auth/nova-senha`. The action tests mock this module away, so
// without this file the branch that decides whether the mechanism engages at
// all has no coverage — a silent change to the destination comparison would
// dead-end every recovery link with no test failing.

const state = vi.hoisted(() => ({
  exchangeError: null as { message: string } | null,
  exchangedCodes: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: async (code: string) => {
        state.exchangedCodes.push(code);
        return { data: {}, error: state.exchangeError };
      },
    },
  }),
}));

const { GET } = await import("@/app/auth/callback/route");
const { RECOVERY_COOKIE, RECOVERY_PATH, RECOVERY_TTL_SECONDS } = await import(
  "@/lib/auth/recovery"
);

const BASE = "http://localhost:3000";

function get(query: string): Promise<Response> {
  return GET(new NextRequest(`${BASE}/auth/callback${query}`));
}

function grantOf(response: Response) {
  // Reading the header rather than the cookies helper, so the assertion is
  // about what actually reaches the browser.
  return (response.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith(`${RECOVERY_COOKIE}=`));
}

beforeEach(() => {
  state.exchangeError = null;
  state.exchangedCodes = [];
});

describe("the recovery grant is stamped exactly when the link is a recovery", () => {
  it("stamps it on a successful exchange bound for the reset page", async () => {
    const response = await get(
      `?code=abc&next=${encodeURIComponent(RECOVERY_PATH)}`,
    );

    expect(state.exchangedCodes).toEqual(["abc"]);
    expect(response.headers.get("location")).toBe(`${BASE}${RECOVERY_PATH}`);
    expect(grantOf(response)).toBeTruthy();
  });

  it("does NOT stamp it for an ordinary sign-in through the same route", async () => {
    // Google sign-in comes through here too. A grant handed out on that path
    // would let any fresh sign-in set a new password without the old one —
    // exactly the takeover the grant exists to prevent.
    const response = await get("?code=abc");

    expect(response.headers.get("location")).toBe(`${BASE}/`);
    expect(grantOf(response)).toBeUndefined();
  });

  it("does not stamp it when the exchange fails", async () => {
    state.exchangeError = { message: "expired" };
    const response = await get(
      `?code=stale&next=${encodeURIComponent(RECOVERY_PATH)}`,
    );

    expect(response.headers.get("location")).toBe(`${BASE}/login?error=oauth`);
    expect(grantOf(response)).toBeUndefined();
  });

  it("does not stamp it — or exchange anything — without a code", async () => {
    const response = await get(`?next=${encodeURIComponent(RECOVERY_PATH)}`);

    expect(state.exchangedCodes).toEqual([]);
    expect(response.headers.get("location")).toBe(`${BASE}/login?error=oauth`);
    expect(grantOf(response)).toBeUndefined();
  });

  it("does not stamp it when the provider reported an error", async () => {
    const response = await get(
      `?error=access_denied&code=abc&next=${encodeURIComponent(RECOVERY_PATH)}`,
    );

    expect(state.exchangedCodes).toEqual([]);
    expect(grantOf(response)).toBeUndefined();
  });

  it("carries the flags that make the grant a grant, not a readable value", async () => {
    const cookie = grantOf(
      await get(`?code=abc&next=${encodeURIComponent(RECOVERY_PATH)}`),
    )!;

    // httpOnly: script on the page must not be able to read or forge it.
    expect(cookie.toLowerCase()).toContain("httponly");
    // Short-lived: a shared machine must not keep the door open.
    expect(cookie).toContain(`Max-Age=${RECOVERY_TTL_SECONDS}`);
    expect(cookie.toLowerCase()).toContain("samesite=lax");
  });
});

describe("the callback cannot be turned into an open redirect", () => {
  it.each([
    "//evil.example.com",
    "https://evil.example.com",
    "/\\evil.example.com",
    "evil.example.com",
  ])("sends %s back to this origin's root", async (hostile) => {
    const response = await get(`?code=abc&next=${encodeURIComponent(hostile)}`);

    const location = response.headers.get("location")!;
    expect(new URL(location).origin).toBe(BASE);
    expect(location).toBe(`${BASE}/`);
  });

  it("still honours an ordinary in-app destination", async () => {
    const response = await get(`?code=abc&next=${encodeURIComponent("/times")}`);
    expect(response.headers.get("location")).toBe(`${BASE}/times`);
  });

  it("does not stamp a grant for a destination that merely looks like one", async () => {
    // A neighbouring path must not inherit the grant by prefix.
    const response = await get(
      `?code=abc&next=${encodeURIComponent(`${RECOVERY_PATH}-outra`)}`,
    );
    expect(grantOf(response)).toBeUndefined();
  });
});
