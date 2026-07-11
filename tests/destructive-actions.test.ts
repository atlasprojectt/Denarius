import { beforeEach, describe, expect, it, vi } from "vitest";

// WP6 of the 2026-07-11 audit plan (QA-05/UX-05): every destructive mutation
// re-checks authorization at execution time, scopes the target to the active
// tenant, and is idempotent — a repeated submit or a foreign id mutates
// nothing and returns a safe already-removed result. Exercised over an
// in-memory Supabase stub recording the exact filters applied.

const state = vi.hoisted(() => ({
  admin: true,
  deleteCount: 1,
  deleteError: null as { code: string } | null,
  filters: [] as { table: string; column: string; value: unknown }[],
  revalidated: [] as string[],
}));

function resetState(): void {
  state.admin = true;
  state.deleteCount = 1;
  state.deleteError = null;
  state.filters = [];
  state.revalidated = [];
}

vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => {
    state.revalidated.push(type ? `${path}|${type}` : path);
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: async () =>
    state.admin
      ? {
          session: {
            userId: "admin-1",
            tenantId: "tenant-A",
            role: "admin",
          },
        }
      : { error: "Somente administradores podem fazer isso." },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const query = {
        delete: () => query,
        update: () => query,
        select: () => query,
        eq: (column: string, value: unknown) => {
          state.filters.push({ table, column, value });
          return query;
        },
        maybeSingle: () =>
          Promise.resolve({ data: null, error: null }),
        then: (onFulfilled: (value: unknown) => unknown) =>
          Promise.resolve({
            data: null,
            error: state.deleteError,
            count: state.deleteError ? null : state.deleteCount,
          }).then(onFulfilled),
      };
      return query;
    },
  }),
}));

import { deleteSubscription } from "@/lib/subscriptions/actions";
import { deleteBudget } from "@/lib/budgets/actions";

const SUB_ID = "5f0c9c1e-7b57-4a52-9d3a-0e51de3a3b6f";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(resetState);

describe("deleteSubscription — tenant-scoped, role-checked, idempotent", () => {
  it("deletes inside the active tenant and revalidates the whole tree", async () => {
    const result = await deleteSubscription({}, form({ subscriptionId: SUB_ID }));
    expect(result.success).toBe("Assinatura removida.");
    expect(state.filters).toContainEqual({
      table: "subscription",
      column: "tenant_id",
      value: "tenant-A",
    });
    expect(state.revalidated).toContain("/|layout");
  });

  it("denies a non-admin before touching anything", async () => {
    state.admin = false;
    const result = await deleteSubscription({}, form({ subscriptionId: SUB_ID }));
    expect(result.error).toBeTruthy();
    expect(state.filters).toHaveLength(0);
  });

  it("repeated submit / cross-tenant id: nothing matched → safe success, no revalidation", async () => {
    state.deleteCount = 0;
    const result = await deleteSubscription({}, form({ subscriptionId: SUB_ID }));
    expect(result.success).toContain("já havia sido removida");
    expect(result.error).toBeUndefined();
    expect(state.revalidated).toHaveLength(0);
  });

  it("a database failure is reported, never swallowed as success", async () => {
    state.deleteError = { code: "500" };
    const result = await deleteSubscription({}, form({ subscriptionId: SUB_ID }));
    expect(result.error).toBeTruthy();
  });

  it("rejects a malformed id before reaching the database", async () => {
    const result = await deleteSubscription({}, form({ subscriptionId: "nope" }));
    expect(result.error).toBeTruthy();
    expect(state.filters).toHaveLength(0);
  });
});

describe("deleteBudget — same destructive contract", () => {
  it("tenant-scoped delete with whole-tree revalidation", async () => {
    const result = await deleteBudget({}, form({ budgetId: SUB_ID }));
    expect(result.success).toBe("Orçamento removido.");
    expect(state.filters).toContainEqual({
      table: "budget",
      column: "tenant_id",
      value: "tenant-A",
    });
    expect(state.revalidated).toContain("/|layout");
  });

  it("already removed → safe success", async () => {
    state.deleteCount = 0;
    const result = await deleteBudget({}, form({ budgetId: SUB_ID }));
    expect(result.success).toContain("já havia sido removido");
  });

  it("viewer denial", async () => {
    state.admin = false;
    const result = await deleteBudget({}, form({ budgetId: SUB_ID }));
    expect(result.error).toBeTruthy();
    expect(state.filters).toHaveLength(0);
  });
});
