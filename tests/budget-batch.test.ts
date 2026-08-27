import { beforeEach, describe, expect, it, vi } from "vitest";

// WP7 of the 2026-07-11 audit plan (UX-09 §9.3): the single-table budget
// batch edit. Validation is all-or-nothing (any invalid row blocks the batch,
// nothing written); frozen FX is preserved on edits and captured ONCE for all
// new rows; empty rows are untouched; partial database failure is reported
// unambiguously. Exercised over an in-memory Supabase stub.

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  ownedTeams: ["11111111-1111-4111-8111-111111111111"],
  existing: [] as {
    id: string;
    scope: string;
    team_id: string | null;
    amount?: number;
    thresholds?: number[];
  }[],
  audited: [] as { action: string; detail: Record<string, unknown> }[],
  inserts: [] as Row[],
  updates: [] as { id: string; payload: Row }[],
  updateFails: false,
  fxCalls: 0,
  revalidated: [] as string[],
}));

function resetState(): void {
  state.ownedTeams = ["11111111-1111-4111-8111-111111111111"];
  state.existing = [];
  state.audited = [];
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

// The audit trail (#73) rides along on every one of these writes. It is
// recorded here rather than reaching this file's query stub, which would mix
// its inserts into the batch assertions — but WHICH edits it records is a
// property of this action, so the calls are captured instead of discarded.
vi.mock("@/lib/audit/log", () => ({
  recordAudit: async () => {},
  recordAuditBatch: async (
    _actor: unknown,
    entries: {
      action: string;
      context?: { target: string | null; detail: Record<string, unknown> };
    }[],
  ) => {
    state.audited.push(
      ...entries.map((e) => ({
        action: e.action,
        detail: e.context?.detail ?? {},
      })),
    );
  },
}));

vi.mock("@/lib/fx/rate", () => ({
  fetchUsdRate: async () => {
    state.fxCalls += 1;
    return { rate: 5.5, source: "test", date: "2026-07-11" };
  },
}));

// The batch now runs through the Neon admin seam (stage 5); the in-memory
// helpers record exactly what the old Supabase stub captured.
vi.mock("@/lib/db/admin", () => ({
  isOwnedTeam: async () => true,
  findTenantDisplayCurrency: async () => "BRL",
  filterOwnedTeamIds: async (_tenantId: string, teamIds: string[]) =>
    teamIds.filter((id) => state.ownedTeams.includes(id)),
  findBudgetForScope: async () => null,
  findBudgetsForPeriod: async () => state.existing.map((e) => ({ ...e })),
  updateBudgetById: async (
    id: string,
    _tenantId: string,
    payload: Record<string, unknown>,
  ) => {
    if (state.updateFails) throw Object.assign(new Error("db failure"), { code: "XX" });
    state.updates.push({ id, payload });
    return 1;
  },
  insertBudget: async (row: Row) => {
    state.inserts.push(row);
  },
  deleteBudgetReturning: async () => ({ count: 0, row: null }),
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
    state.existing = [
      {
        id: "b-org",
        scope: "org",
        team_id: null,
        amount: 10000,
        thresholds: [0.8, 1.0],
      },
    ];
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

  // #73. The UPDATE writes amount AND thresholds, so auditing on amount alone
  // let a warn threshold move from 80% to 99% — a change in when this tenant
  // gets alerted at all — leave no trail. A re-submitted untouched row must
  // still stay out of the log, or the real edits drown in noise.
  describe("the audit trail follows every field the UPDATE writes", () => {
    const existingOrg = {
      id: "b-org",
      scope: "org",
      team_id: null,
      amount: 12000,
      thresholds: [0.8, 1.0],
    };

    const save = (amount: string, warnPct: string) =>
      saveBudgetsBatch(
        {},
        form([
          ["row", "org"],
          ["amount|org", amount],
          ["warnPct|org", warnPct],
        ]),
      );

    it("records a threshold-only edit", async () => {
      state.existing = [existingOrg];

      const result = await save("12.000,00", "99");

      expect(result.success).toBeTruthy();
      expect(state.updates).toHaveLength(1);
      expect(state.audited).toHaveLength(1);
      expect(state.audited[0].action).toBe("budget.updated");
      expect(state.audited[0].detail).toMatchObject({
        fromWarnPct: 80,
        warnPct: 99,
      });
    });

    it("still records an amount-only edit", async () => {
      state.existing = [existingOrg];

      await save("15.000,00", "80");

      expect(state.audited).toHaveLength(1);
      expect(state.audited[0].detail).toMatchObject({ from: 12000, to: 15000 });
    });

    it("stays silent when the re-submitted row changed nothing", async () => {
      state.existing = [existingOrg];

      await save("12.000,00", "80");

      // The row is written either way — the batch form re-submits everything.
      expect(state.updates).toHaveLength(1);
      expect(state.audited).toHaveLength(0);
    });
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
    state.existing = [
      {
        id: "b-org",
        scope: "org",
        team_id: null,
        amount: 10000,
        thresholds: [0.8, 1.0],
      },
    ];
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
