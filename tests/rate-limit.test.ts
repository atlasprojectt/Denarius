import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  INVITE_ACCEPT,
  INVITE_CREATE,
  RATE_LIMITED_MESSAGE,
  bucketKey,
  hashSubject,
} from "@/lib/auth/rate-limit";

// Issue #61 — rate limiting the invitation paths. Two halves: the key derivation
// is pure and tested here directly; the window itself lives in Postgres (one
// atomic statement, or two concurrent callers both read "limit - 1" and both
// proceed), so it is exercised against the real function below and self-skips
// until the migration is applied.

describe("what the limiter stores", () => {
  it("never puts the raw subject in the key", () => {
    // The subject is an IP or a tenant id. An IP is personal data under the
    // LGPD, and this table has no business becoming a record of who tried what.
    const ip = "203.0.113.7";
    const key = bucketKey(INVITE_ACCEPT, hashSubject(ip));
    expect(key).not.toContain(ip);
    expect(key.startsWith("invite:accept:")).toBe(true);
  });

  it("hashes deterministically, so one caller keeps one bucket", () => {
    expect(hashSubject("203.0.113.7")).toBe(hashSubject("203.0.113.7"));
    expect(hashSubject("203.0.113.7")).not.toBe(hashSubject("203.0.113.8"));
  });

  it("keeps the two paths in separate buckets", () => {
    // Otherwise an Admin inviting colleagues would spend the budget that
    // protects the public accept endpoint.
    expect(bucketKey(INVITE_CREATE, "x")).not.toBe(bucketKey(INVITE_ACCEPT, "x"));
  });

  it("answers without disclosing accounts, tokens or addresses", () => {
    expect(RATE_LIMITED_MESSAGE).not.toMatch(/convite|conta|token|e-?mail/i);
    expect(RATE_LIMITED_MESSAGE).toMatch(/tentativas/i);
  });

  it("keeps the limits generous enough not to fire on ordinary use", () => {
    // A limiter that trips on real work teaches people to distrust the product.
    expect(INVITE_CREATE.limit).toBeGreaterThanOrEqual(20);
    expect(INVITE_ACCEPT.limit).toBeGreaterThanOrEqual(5);
    for (const rule of [INVITE_CREATE, INVITE_ACCEPT]) {
      expect(rule.windowSeconds).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// The window, against the real Postgres function.
// ---------------------------------------------------------------------------

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasEnv = Boolean(url && serviceKey);

const admin = hasEnv
  ? createClient(url!, serviceKey!, { auth: { persistSession: false } })
  : null;

async function take(bucket: string, limit: number, windowSeconds: number) {
  const { data, error } = await admin!.rpc("rate_limit_take", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  return data as boolean;
}

async function limiterApplied(): Promise<boolean> {
  if (!admin) return false;
  const { error } = await admin.rpc("rate_limit_take", {
    p_bucket: `probe:${Date.now()}`,
    p_limit: 1,
    p_window_seconds: 1,
  });
  return !error;
}

const ready = await limiterApplied();
if (!ready) {
  console.warn(
    "\n[rate-limit] SKIPPED — missing env or the rate-limit migration is not applied. " +
      "Apply supabase/migrations/20260805100000_rate_limit.sql and re-run: npm test\n",
  );
}

describe.skipIf(!ready)("the window, in Postgres (issue #61)", () => {
  it("allows up to the limit and then refuses", async () => {
    const bucket = `test:limit:${Date.now()}:${Math.random()}`;
    expect(await take(bucket, 3, 60)).toBe(true);
    expect(await take(bucket, 3, 60)).toBe(true);
    expect(await take(bucket, 3, 60)).toBe(true);
    expect(await take(bucket, 3, 60)).toBe(false);
    // A refused attempt must not consume a slot of its own, or the window
    // would never reopen for someone retrying politely.
    expect(await take(bucket, 3, 60)).toBe(false);
  });

  it("reopens once the window has passed", async () => {
    const bucket = `test:window:${Date.now()}:${Math.random()}`;
    expect(await take(bucket, 1, 1)).toBe(true);
    expect(await take(bucket, 1, 1)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 1600));
    expect(await take(bucket, 1, 1)).toBe(true);
  });

  it("keeps buckets independent", async () => {
    const a = `test:a:${Date.now()}:${Math.random()}`;
    const b = `test:b:${Date.now()}:${Math.random()}`;
    expect(await take(a, 1, 60)).toBe(true);
    expect(await take(a, 1, 60)).toBe(false);
    expect(await take(b, 1, 60)).toBe(true);
  });

  it("holds under concurrent callers", async () => {
    // The reason the function takes an advisory lock on the bucket: under
    // read-committed isolation, two requests read the same snapshot, neither
    // sees the other's uncommitted insert, and both conclude they are under
    // the limit. This is the test that would catch losing that lock.
    const bucket = `test:race:${Date.now()}:${Math.random()}`;
    const verdicts = await Promise.all(
      Array.from({ length: 12 }, () => take(bucket, 5, 60)),
    );
    expect(verdicts.filter(Boolean)).toHaveLength(5);
  });

  it("is not reachable from a browser session", async () => {
    // System state, like notification_log: RLS with no policies, and the
    // function's default grant revoked.
    const anon = createClient(url!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
    const { error: rpcError } = await anon.rpc("rate_limit_take", {
      p_bucket: "anon:probe",
      p_limit: 1,
      p_window_seconds: 60,
    });
    expect(rpcError).not.toBeNull();

    const { data: rows } = await anon.from("rate_limit_hit").select("id").limit(1);
    expect(rows ?? []).toHaveLength(0);
  });
});
