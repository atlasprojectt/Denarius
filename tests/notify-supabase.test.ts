import { beforeEach, describe, expect, it, vi } from "vitest";

const createAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));

import {
  findNotificationLogLevels,
  insertNotificationLogIfAbsent,
  listBudgetTenantIds,
  listDigestTenantIds,
} from "@/lib/notify/supabase";

type QueryResult = { data: unknown; error: { code: string } | null };

function queueResults(...results: QueryResult[]) {
  const queue = [...results];
  const calls: { method: string; args: unknown[] }[] = [];
  createAdminClientMock.mockImplementation(() => {
    const result = queue.shift() ?? { data: [], error: null };
    const builder = {
      from: (...args: unknown[]) => {
        calls.push({ method: "from", args });
        return builder;
      },
      select: (...args: unknown[]) => {
        calls.push({ method: "select", args });
        return builder;
      },
      eq: (...args: unknown[]) => {
        calls.push({ method: "eq", args });
        return builder;
      },
      gte: (...args: unknown[]) => {
        calls.push({ method: "gte", args });
        return builder;
      },
      maybeSingle: () => builder,
      upsert: (...args: unknown[]) => {
        calls.push({ method: "upsert", args });
        return builder;
      },
      then: (resolve: (value: QueryResult) => unknown) =>
        Promise.resolve(result).then(resolve),
    };
    return builder;
  });
  return calls;
}

describe("notification Supabase adapter", () => {
  beforeEach(() => {
    createAdminClientMock.mockReset();
  });

  it("lists unique budget tenants from the product database", async () => {
    queueResults({
      data: [{ tenant_id: "tenant-a" }, { tenant_id: "tenant-a" }, { tenant_id: "tenant-b" }],
      error: null,
    });

    await expect(listBudgetTenantIds("2026-09-01")).resolves.toEqual([
      "tenant-a",
      "tenant-b",
    ]);
  });

  it("limits weekly digests to organization budgets", async () => {
    const calls = queueResults({ data: [{ tenant_id: "tenant-a" }], error: null });

    await expect(listDigestTenantIds("2026-09-01")).resolves.toEqual(["tenant-a"]);
    expect(calls).toContainEqual({ method: "eq", args: ["scope", "org"] });
  });

  it("propagates database errors instead of turning them into no recipients", async () => {
    queueResults({ data: null, error: { code: "42P01" } });

    await expect(findNotificationLogLevels("tenant-a", "2026-09-01")).rejects.toMatchObject({
      code: "42P01",
    });
  });

  it("upserts dedup rows with the notification uniqueness key", async () => {
    const calls = queueResults({ data: null, error: null });
    const rows = [
      {
        tenant_id: "tenant-a",
        channel: "email",
        target_id: "org",
        level: "warning",
        period_month: "2026-09-01",
      },
    ];

    await insertNotificationLogIfAbsent(rows);

    expect(calls).toContainEqual({
      method: "upsert",
      args: [rows, { onConflict: "tenant_id,channel,target_id,level,period_month", ignoreDuplicates: true }],
    });
  });
});
