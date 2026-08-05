import { beforeEach, describe, expect, it, vi } from "vitest";

// WP7 of the 2026-07-11 audit plan (UX-09 §9.3): the single-table budget
// batch edit. Validation is all-or-nothing (any invalid row blocks the batch,
// nothing written); frozen FX is preserved on edits and captured ONCE for all
// new rows; empty rows are untouched; partial database failure is reported
// unambiguously. Exercised over an in-memory Supabase stub.

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  ownedTeams: ["11111111-1111-4111-8111-111111111111"],
  existing: [] as { id: string; scope: string; team_id: string | null }[],
  inserts: [] as Row[],
  updates: [] as { id: string; payload: Row }[],
  updateFails: false,
  fxCalls: 0,
  revalidated: [] as string[],
}));

function resetState(): void {
  state.ownedTeams = ["11111111-1111-4111-8111-111111111111"];
  state.existing = [];
  state.inserts = [];
  state.updates = [];
  state.updateFails = false;
  state.fxCalls = 0;
  state.revalidated = [];
}

vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => {
    state.revalidated.push(type ? `${path}|${type}` : path);
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: async () => ({
    session: {
      userId: "admin-1",
      tenantId: "tenant-A",
      role: "admin",
      email: "admin@tenant-a.test",
    },
  }),
}));

// The audit trail (#73) rides along on every one of these writes; it has its
// own tests, and letting it reach this file's query stub would mix its inserts
// into the batch assertions.
vi.mock("@/lib/audit/log", () => ({
  recordAudit: async () => {},
  recordAuditBatch: async () => {},
}));

vi.mock("@/lib/fx/rate", () => ({
  fetchUsdRate: async () => {
    state.fxCalls += 1;
    return { rate: 5.5, source: "test", date: "2026-07-11" };
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const ops: { name: string; args: unknown[] }[] = [];
      const push =
        (name: string) =>
        (...args: unknown[]) => {
          ops.push({ name, args });
          return query;
        };
      const resolve = () => {
        if (table === "team") {
          return {
            data: state.ownedTeams.map((id) => ({ id })),
            error: null,
          };
        }
        if (table === "tenant") {
          return { data: { display_currency: "BRL" }, error: null };
        }
        if (table === "budget" && ops.some((o) => o.name === "select")) {
          return { data: state.existing, error: null };
        }
        if (table === "budget" && ops.some((o) => o.name === "update")) {
          const payload = ops.find((o) => o.name === "update")!.args[0] as Row;
          const id = ops.find((o) => o.name === "eq" && o.args[0] === "id")!
            .args[1] as string;
          if (state.updateFails) return { data: null, error: { code: "XX" }, count: null };
          state.updates.push({ id, payload });
          return { data: null, error: null, count: 1 };
        }
        if (table === "budget" && ops.some((o) => o.name === "insert")) {
          state.inserts.push(ops.find((o) => o.name === "insert")!.args[0] as Row);
          return { data: null, error: null };
        }
        return { data: null, error: null };
      };
      const query = {
        select: push("select"),
        insert: push("insert"),
        update: push("update"),
        eq: push("eq"),
        in: push("in"),
        maybeSingle: () => Promise.resolve(resolve()),
        then: (onFulfilled: (value: unknown) => unknown) =>
          Promise.resolve(resolve()).then(onFulfilled),
      };
      return query;
    },
  }),
}));

import { saveBudgetsBatch } from "@/lib/budgets/actions";

const TEAM = "11111111-1111-4111-8111-111111111111";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

beforeEach(resetState);

describe("saveBudgetsBatch — one Save for the whole table", () => {
  it("inserts new org + team rows sharing ONE fresh FX capture", async () => {
    const result = await saveBudgetsBatch(
      {},
      form([
        ["row", "org"],
        ["amount|org", "10.000,00"],
        ["warnPct|org", "80"],
        ["row", `team:${TEAM}`],
        [`amount|team:${TEAM}`, "1.120,00"],
        [`warnPct|team:${TEAM}`, "75"],
      ]),
    );
    expect(result.success).toBe("Orçamentos salvos.");
    expect(state.inserts).toHaveLength(2);
    expect(state.fxCalls).toBe(1); // one capture for the whole batch
    for (const row of state.inserts) {
      expect(row.frozen_fx_rate).toBe(5.5);
      expect(row.tenant_id).toBe("tenant-A");
    }
    const org = state.inserts.find((r) => r.scope === "org")!;
    expect(org.amount).toBe(10000);
    expect(org.thresholds).toEqual([0.8, 1.0]);
    expect(state.revalidated).toContain("/|layout");
  });

  it("edits existing rows WITHOUT recapturing or touching the frozen FX", async () => {
    state.existing = [{ id: "b-org", scope: "org", team_id: null }];
    const result = await saveBudgetsBatch(
      {},
      form([
        ["row", "org"],
        ["amount|org", "12.000,00"],
        ["warnPct|org", "85"],
      ]),
    );
    expect(result.success).toBeTruthy();
    expect(state.fxCalls).toBe(0);
    expect(state.updates).toHaveLength(1);
    const payload = state.updates[0].payload;
    expect(payload.amount).toBe(12000);
    expect("frozen_fx_rate" in payload).toBe(false); // frozen rate untouched
  });

  it("skips empty rows — an unfilled scope is untouched, not an error", async () => {
    const result = await saveBudgetsBatch(
      {},
      form([
        ["row", "org"],
        ["amount|org", "10.000,00"],
        ["warnPct|org", "80"],
        ["row", `team:${TEAM}`],
        [`amount|team:${TEAM}`, ""],
        [`warnPct|team:${TEAM}`, "80"],
      ]),
    );
    expect(result.success).toBeTruthy();
    expect(state.inserts).toHaveLength(1);
  });

  it("any invalid row blocks the WHOLE batch with per-field errors", async () => {
    const result = await saveBudgetsBatch(
      {},
      form([
        ["row", "org"],
        ["amount|org", "10.000,00"],
        ["warnPct|org", "80"],
        ["row", `team:${TEAM}`],
        [`amount|team:${TEAM}`, "-50"],
        [`warnPct|team:${TEAM}`, "80"],
      ]),
    );
    expect(result.error).toBeTruthy();
    expect(result.fieldErrors?.[`amount|team:${TEAM}`]).toContain("maior que zero");
    expect(state.inserts).toHaveLength(0); // nothing written
    expect(state.updates).toHaveLength(0);
  });

  it("rejects a team outside the tenant before writing anything", async () => {
    const foreign = "22222222-2222-4222-8222-222222222222";
    const result = await saveBudgetsBatch(
      {},
      form([
        ["row", `team:${foreign}`],
        [`amount|team:${foreign}`, "1.000,00"],
        [`warnPct|team:${foreign}`, "80"],
      ]),
    );
    expect(result.error).toBe("Escolha um time válido.");
    expect(state.inserts).toHaveLength(0);
  });

  it("reports a partial failure unambiguously (documented strategy)", async () => {
    state.existing = [{ id: "b-org", scope: "org", team_id: null }];
    state.updateFails = true;
    const result = await saveBudgetsBatch(
      {},
      form([
        ["row", "org"],
        ["amount|org", "12.000,00"],
        ["warnPct|org", "85"],
        ["row", `team:${TEAM}`],
        [`amount|team:${TEAM}`, "1.000,00"],
        [`warnPct|team:${TEAM}`, "80"],
      ]),
    );
    expect(result.error).toContain("1 de 2");
    expect(state.inserts).toHaveLength(1); // the team row still landed
  });

  it("an entirely empty batch is a no-op error, not a silent success", async () => {
    const result = await saveBudgetsBatch(
      {},
      form([
        ["row", "org"],
        ["amount|org", ""],
        ["warnPct|org", "80"],
      ]),
    );
    expect(result.error).toBe("Nenhum orçamento para salvar.");
  });
});
