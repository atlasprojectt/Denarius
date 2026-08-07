import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { isReportPath } from "@/lib/reports/path";

const snapshotRow = {
  period_month: "2026-07-01",
  closed_at: "2026-08-01T06:00:00.000Z",
  source: "auto",
  currency: "BRL",
  api_usd: 100,
  seats_amount: 500,
  combined_amount: 1050,
  budget_amount: 1200,
  pct_spent: 0.875,
  frozen_fx_rate: 5.5,
  fx_rate_source: "open.er-api.com",
  fx_rate_date: "2026-07-01",
  verdict_status: "amber",
  verdict_sentence: "A empresa fechou julho dentro do orçamento, perto do limite.",
  breakdown: {
    teams: [],
    providers: [{ provider: "openai", usd: 100, display: 550 }],
    topDrivers: [],
    unattributed: { apiUsd: 0, seats: 0, display: 0 },
    seats: { available: true, total: 500, unattributed: 0, subscriptions: [] },
    reconciliation: {
      derivedUsd: 100,
      reportedUsd: 100,
      differenceUsd: 0,
      toleranceUsd: 5,
      withinTolerance: true,
    },
  },
  has_uncosted: false,
  reconciliation_ok: true,
  fx_missing: false,
  stale_sync: false,
  tenant: { name: "Empresa Teste" },
};

async function loadQueries(result: { data: unknown; error: unknown }) {
  vi.resetModules();
  const tables: string[] = [];
  const selections: string[] = [];
  const order = vi.fn(() => Promise.resolve(result));
  const maybeSingle = vi.fn(() => Promise.resolve(result));
  const createClient = vi.fn(async () => ({
    from(table: string) {
      tables.push(table);
      const query = {
        select(columns: string) {
          selections.push(columns);
          return query;
        },
        order,
        eq() {
          return query;
        },
        maybeSingle,
      };
      return query;
    },
  }));
  vi.doMock("@/lib/supabase/server", () => ({ createClient }));
  const queries = await import("@/lib/reports/queries");
  return { ...queries, tables, selections, order, createClient };
}

describe("monthly report reads", () => {
  it("lists only frozen snapshots, newest first", async () => {
    const query = await loadQueries({ data: [snapshotRow], error: null });
    const read = await query.listMonthlyReports();

    expect(query.tables).toEqual(["period_snapshot"]);
    expect(query.order).toHaveBeenCalledWith("period_month", {
      ascending: false,
    });
    expect(read.ok).toBe(true);
    expect(read.reports[0]).toMatchObject({
      periodMonth: "2026-07-01",
      combinedAmount: 1050,
      caveatCount: 0,
    });
  });

  it("builds a month from period_snapshot alone — never live spend tables", async () => {
    const query = await loadQueries({ data: snapshotRow, error: null });
    const report = await query.monthlyReport("2026-07");

    expect(query.tables).toEqual(["period_snapshot"]);
    expect(query.selections[0]).toContain("breakdown");
    expect(query.selections[0]).toContain("tenant:tenant_id(name)");
    expect(report).toMatchObject({
      companyName: "Empresa Teste",
      periodMonth: "2026-07-01",
      combinedAmount: 1050,
      verdictStatus: "amber",
    });
  });

  it("rejects a malformed period before opening a database client", async () => {
    const query = await loadQueries({ data: snapshotRow, error: null });

    expect(await query.monthlyReport("2026-13")).toBeNull();
    expect(await query.monthlyReport("julho")).toBeNull();
    expect(query.createClient).not.toHaveBeenCalled();
  });
});

describe("report shell and print contract", () => {
  it("recognizes the list and detail paths so the shell skips live cockpit reads", () => {
    expect(isReportPath("/relatorios")).toBe(true);
    expect(isReportPath("/relatorios/2026-07")).toBe(true);
    expect(isReportPath("/relatorios-falso")).toBe(false);
    expect(isReportPath("/times")).toBe(false);
  });

  it("hides app chrome, forces paper light mode and protects report cards", () => {
    const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    const print = css.slice(css.indexOf("@media print"));

    expect(print).toContain('[data-slot="sidebar-container"]');
    expect(print).toContain("[data-app-header]");
    expect(print).toContain("color-scheme: light");
    expect(print).toContain("break-inside: avoid");
    expect(print).toContain(".report-running-header");
  });

  it("keeps the fixed executive sections in the same source order", () => {
    const component = readFileSync(
      path.join(
        process.cwd(),
        "app/(app)/relatorios/_components/monthly-report.tsx",
      ),
      "utf8",
    );
    const positions = [
      "header",
      "verdict",
      "spend",
      "providers",
      "teams",
      "seats-unattributed",
      "caveats",
    ].map((section) => component.indexOf(`data-report-section="${section}"`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
