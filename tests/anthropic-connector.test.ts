import { describe, expect, it } from "vitest";

import { AnthropicProvider } from "@/lib/connectors/anthropic";
import { createFakeAnthropicProvider } from "@/lib/connectors/fake";

// The fake serves canonical Anthropic Admin API pages through the REAL
// parsing and pagination code (it replaces fetch, not the provider) — so
// these tests cover the production request/normalization path with zero
// live calls.

const DAY = 24 * 3600;
// 2026-06-01T00:00:00Z .. 2026-07-01T00:00:00Z — 30 days, forces pagination.
const RANGE = { startTime: 1780272000, endTime: 1780272000 + 30 * DAY };

describe("AnthropicProvider over canonical fixtures", () => {
  const provider = createFakeAnthropicProvider();

  it("normalizes usage buckets: daily UTC dates, one row per grouping cell", async () => {
    const usage = await provider.fetchUsage(RANGE);
    // 30 days × 4 grouped results/day, across 2 paginated pages.
    expect(usage).toHaveLength(120);

    const first = usage[0];
    expect(first.date).toBe("2026-06-01");
    expect(first).toMatchObject({
      projectId: "wrkspc_eng",
      apiKeyId: "apikey_eng_agents",
      model: "claude-sonnet-4-5-20250929",
      outputTokens: 250_000,
    });
    // Input = uncached (900k) + cache writes (60k + 40k) + cache reads (200k).
    expect(first.inputTokens).toBe(1_200_000);

    const dates = new Set(usage.map((u) => u.date));
    expect(dates.size).toBe(30);
    expect(dates.has("2026-06-30")).toBe(true);
    expect(dates.has("2026-07-01")).toBe(false); // end is exclusive

    // The unknown model rides through normalization untouched (uncosted later).
    expect(usage.some((u) => u.model === "claude-nova-experimental")).toBe(true);
  });

  it("has no per-user grain: userId is always empty (attribution stops at key/workspace)", async () => {
    const usage = await provider.fetchUsage(RANGE);
    expect(usage.every((u) => u.userId === "")).toBe(true);
    // The attribution keys ARE present — workspace (→ team in #17) and api key.
    expect(usage.every((u) => u.projectId !== "" && u.apiKeyId !== "")).toBe(true);
  });

  it("normalizes cost buckets: decimal-string amounts to numbers, USD lowercased", async () => {
    const costs = await provider.fetchCosts(RANGE);
    expect(costs).toHaveLength(60); // 30 days × 2 workspace line items

    const total = costs.reduce((sum, c) => sum + c.amount, 0);
    expect(total).toBeCloseTo(30 * (14.95 + 2.7), 6);
    expect(costs.every((c) => c.currency === "usd")).toBe(true);
    expect(costs.every((c) => c.projectId.startsWith("wrkspc_"))).toBe(true);
  });

  it("testConnection succeeds against the fake backend", async () => {
    expect(await provider.testConnection()).toEqual({ ok: true });
  });

  it("testConnection maps 401/403 to invalid_key and network failure to network", async () => {
    const denied = new AnthropicProvider("sk-ant-bad", async () =>
      new Response("unauthorized", { status: 401 }),
    );
    expect(await denied.testConnection()).toEqual({
      ok: false,
      reason: "invalid_key",
    });

    const offline = new AnthropicProvider("sk-ant-any", async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await offline.testConnection()).toEqual({
      ok: false,
      reason: "network",
    });
  });

  it("fetchUsage surfaces HTTP errors instead of returning partial data", async () => {
    const flaky = new AnthropicProvider("sk-ant-any", async () =>
      new Response("rate limited", { status: 429 }),
    );
    await expect(flaky.fetchUsage(RANGE)).rejects.toThrow(/429/);
  });

  it("speaks the Anthropic wire contract, not OpenAI's", async () => {
    const requests: { url: string; headers: Record<string, string> }[] = [];
    const capture = new AnthropicProvider("sk-ant-admin-key", async (url, init) => {
      requests.push({ url, headers: (init.headers ?? {}) as Record<string, string> });
      return new Response(
        JSON.stringify({ data: [], has_more: false, next_page: null }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    await capture.fetchUsage(RANGE);
    await capture.fetchCosts(RANGE);

    for (const request of requests) {
      // Anthropic auth is x-api-key + anthropic-version, never a Bearer token.
      expect(request.headers["x-api-key"]).toBe("sk-ant-admin-key");
      expect(request.headers["anthropic-version"]).toBeDefined();
      expect(request.headers.Authorization).toBeUndefined();
      // RFC 3339 window params, not unix start_time/end_time.
      const params = new URL(request.url).searchParams;
      expect(params.get("starting_at")).toBe("2026-06-01T00:00:00Z");
      expect(params.get("start_time")).toBeNull();
    }
    expect(requests[0].url).toContain("/v1/organizations/usage_report/messages");
    expect(requests[1].url).toContain("/v1/organizations/cost_report");
    // Grouping requests the attribution grain: workspace + api key (+ model).
    expect(new URL(requests[0].url).searchParams.getAll("group_by[]")).toEqual([
      "workspace_id",
      "api_key_id",
      "model",
    ]);
  });
});
