import { describe, expect, it } from "vitest";

import { createFakeOpenAIProvider } from "@/lib/connectors/fake";
import { OpenAIProvider } from "@/lib/connectors/openai";

// The fake serves canonical OpenAI Admin API pages through the REAL parsing
// and pagination code (it replaces fetch, not the provider) — so these tests
// cover the production request/normalization path with zero live calls.

const DAY = 24 * 3600;
// 2026-06-01T00:00:00Z .. 2026-07-01T00:00:00Z — 30 days, forces pagination.
const RANGE = { startTime: 1780272000, endTime: 1780272000 + 30 * DAY };

describe("OpenAIProvider over canonical fixtures", () => {
  const provider = createFakeOpenAIProvider();

  it("normalizes usage buckets: daily UTC dates, one row per grouping cell", async () => {
    const usage = await provider.fetchUsage(RANGE);
    // 30 days × 4 grouped results/day, across 2 paginated pages.
    expect(usage).toHaveLength(120);

    const first = usage[0];
    expect(first.date).toBe("2026-06-01");
    expect(first).toMatchObject({
      projectId: "proj_eng",
      apiKeyId: "key_ana",
      userId: "user_ana",
      model: "gpt-4o",
      inputTokens: 1_200_000,
      outputTokens: 300_000,
    });

    const dates = new Set(usage.map((u) => u.date));
    expect(dates.size).toBe(30);
    expect(dates.has("2026-06-30")).toBe(true);
    expect(dates.has("2026-07-01")).toBe(false); // end is exclusive

    // The unknown model rides through normalization untouched (uncosted later).
    expect(usage.some((u) => u.model === "omni-nova")).toBe(true);
  });

  it("normalizes cost buckets and preserves the provider-reported USD amounts", async () => {
    const costs = await provider.fetchCosts(RANGE);
    expect(costs).toHaveLength(60); // 30 days × 2 project line items

    const total = costs.reduce((sum, c) => sum + c.amount, 0);
    expect(total).toBeCloseTo(30 * (9.2 + 2.45), 6);
    expect(costs.every((c) => c.currency === "usd")).toBe(true);
    expect(costs.every((c) => c.lineItem === "completions")).toBe(true);
  });

  it("testConnection succeeds against the fake backend", async () => {
    expect(await provider.testConnection()).toEqual({ ok: true });
  });

  it("testConnection maps 401/403 to invalid_key and network failure to network", async () => {
    const denied = new OpenAIProvider("sk-bad", async () =>
      new Response("unauthorized", { status: 401 }),
    );
    expect(await denied.testConnection()).toEqual({
      ok: false,
      reason: "invalid_key",
    });

    const offline = new OpenAIProvider("sk-any", async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await offline.testConnection()).toEqual({
      ok: false,
      reason: "network",
    });
  });

  it("fetchUsage surfaces HTTP errors instead of returning partial data", async () => {
    const flaky = new OpenAIProvider("sk-any", async () =>
      new Response("rate limited", { status: 429 }),
    );
    await expect(flaky.fetchUsage(RANGE)).rejects.toThrow(/429/);
  });
});
