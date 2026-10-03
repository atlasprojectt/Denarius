import { beforeEach, describe, expect, it, vi } from "vitest";

const createAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));

import { findBudgetForScope, insertBudget } from "@/lib/budgets/admin";

type QueryResult = {
  data: unknown;
  error: { code: string } | null;
};

function queueResult(result: QueryResult) {
  const calls: { method: string; args: unknown[] }[] = [];
  createAdminClientMock.mockImplementation(() => {
    const builder = {
      from: (...args: unknown[]) => {
        calls.push({ method: "from", args });
        return builder;
      },
      select: (...args: unknown[]) => {
        calls.push({ method: "select", args });
        return builder;
      },
      insert: (...args: unknown[]) => {
        calls.push({ method: "insert", args });
        return builder;
      },
      eq: (...args: unknown[]) => {
        calls.push({ method: "eq", args });
        return builder;
      },
      is: (...args: unknown[]) => {
        calls.push({ method: "is", args });
        return builder;
      },
      maybeSingle: () => builder,
      then: (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve),
    };
    return builder;
  });
  return calls;
}

describe("budget Supabase adapter", () => {
  beforeEach(() => createAdminClientMock.mockReset());

  it("writes budgets through the product Supabase database", async () => {
    const calls = queueResult({ data: null, error: null });
    const row = {
      tenant_id: "tenant-a",
      scope: "org" as const,
      team_id: null,
      period_month: "2026-10-01",
      amount: 1000,
      currency: "BRL",
      thresholds: [0.8, 1],
      frozen_fx_rate: 5.1,
      fx_rate_source: "test",
      fx_rate_date: "2026-10-01",
    };

    await insertBudget(row);

    expect(calls).toContainEqual({ method: "from", args: ["budget"] });
    expect(calls).toContainEqual({ method: "insert", args: [row] });
  });

  it("scopes organization reads with a null team id", async () => {
    const calls = queueResult({
      data: { id: "budget-a", amount: "1000.00" },
      error: null,
    });

    await expect(findBudgetForScope("tenant-a", "org", null, "2026-10-01")).resolves.toEqual({
      id: "budget-a",
      amount: 1000,
    });
    expect(calls).toContainEqual({ method: "eq", args: ["tenant_id", "tenant-a"] });
    expect(calls).toContainEqual({ method: "is", args: ["team_id", null] });
  });
});
