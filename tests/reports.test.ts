import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { isReportPath, LIVE_REPORT_PATH } from "@/lib/reports/path";

const reportSheetSource = readFileSync(
  path.join(process.cwd(), "app/(app)/relatorios/_components/report-sheet.tsx"),
  "utf8",
);
const reportsIndexSource = readFileSync(
  path.join(process.cwd(), "app/(app)/relatorios/page.tsx"),
  "utf8",
);
const reportViewerSource = readFileSync(
  path.join(process.cwd(), "app/(app)/relatorios/_components/report-viewer.tsx"),
  "utf8",
);

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
  verdict_sentence: "A empresa fechou julho dentro do orÃ§amento, perto do limite.",
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

  it("builds a month from period_snapshot alone â€” never live spend tables", async () => {
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
  it("keeps the current report as the primary, independently readable entry", () => {
    expect(reportsIndexSource).toContain("readCurrentReport");
    expect(reportsIndexSource).toContain("listMonthlyReports");
    expect(reportsIndexSource).toContain("Promise.all");
    expect(reportsIndexSource).toContain("copy.liveCardCta");
    expect(reportsIndexSource).toContain("LIVE_REPORT_PATH");
  });

  it("recognizes the list and detail paths so the shell skips live cockpit reads", () => {
    expect(isReportPath("/relatorios")).toBe(true);
    expect(isReportPath("/relatorios/2026-07")).toBe(true);
    expect(isReportPath("/relatorios-falso")).toBe(false);
    expect(isReportPath("/times")).toBe(false);
  });

  it("exempts the on-demand report, which is live by definition", () => {
    // The frozen surfaces suppress the shell's current-month reads; the report
    // of right now must keep them â€” its stale-sync banner is the point.
    expect(isReportPath(LIVE_REPORT_PATH)).toBe(false);
    expect(isReportPath("/relatorios/agora")).toBe(false);
  });

  it("keeps the repeated header inside the page and fragments only at safe boundaries", () => {
    const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    const print = css.slice(css.indexOf("@media print"));

    expect(print).toContain('[data-slot="sidebar-container"]');
    expect(print).toContain("[data-app-header]");
    expect(print).toContain('[data-slot="dialog-overlay"]');
    expect(print).toContain("color-scheme: light");
    expect(print).toContain(".report-print-header");
    expect(print).toContain("display: table-header-group");
    expect(print).toContain(".report-print-footer");
    expect(print).toContain("display: table-footer-group");
    expect(print).toContain("[data-print-keep]");
    expect(print).toContain(".report-section");
    expect(print).toContain("break-inside: auto");
    expect(print).not.toContain("position: fixed");
    expect(print).not.toContain("top: -15mm");
  });

  it("keeps the fixed executive sections in the same source order", () => {
    // ONE template serves both periods, so this order holds for the closed
    // month and the on-demand report alike â€” that is what makes a partial
    // recognizable as the same document once the month closes.
    const positions = [
      "header",
      "summary",
      "overview",
      "providers",
      "teams",
      "subscriptions",
      "unattributed",
      "caveats",
    ].map((section) => reportSheetSource.indexOf(`data-report-section="${section}"`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("keeps the print hooks on the shared sheet, so both variants print alike", () => {
    expect(reportSheetSource).toContain("data-report-sheet");
    expect(reportSheetSource).toContain("report-document-header");
    expect(reportSheetSource).toContain("report-brand-footer");
    expect(reportSheetSource).toContain("<LogoWordmark");
    expect(reportSheetSource).toContain("<ReportViewer");
    expect(reportViewerSource).toContain("pdfUrl");
    expect(reportViewerSource).toContain("RiExpandDiagonalLine");
    expect(reportViewerSource).not.toContain("pagedjs");
    expect(reportSheetSource).toContain("report-print-frame");
    expect(reportSheetSource).toContain("report-print-header");
    expect(reportSheetSource).toContain("report-print-footer");
    expect(reportSheetSource).toContain("report-print-body");
    expect(reportSheetSource).toContain("data-print-keep");
  });
  it("keeps the legacy print-instructions modal out of the report flow", () => {
    expect(reportSheetSource).not.toContain("printPrepTitle");
    expect(reportViewerSource).not.toContain("Antes de imprimir");
    expect(reportViewerSource).toContain("Baixar PDF");
    expect(reportViewerSource).toContain("Expandir");
  });
});

describe("the on-demand report", () => {
  const source = readFileSync(
    path.join(process.cwd(), "lib/reports/current.ts"),
    "utf8",
  );

  it("stays inside the tenant's own session â€” never the service role", () => {
    // The closing job is the one deliberate cross-tenant path; a user asking
    // for their own situation is not (invariant #1).
    expect(source).toContain("@/lib/supabase/server");
    expect(source).not.toContain("createAdminClient");
    expect(source).not.toContain("@/lib/supabase/admin");
  });

  it("writes nothing: a partial month is rendered and discarded", () => {
    for (const write of ["insert(", "upsert(", "update(", "delete("]) {
      expect(source).not.toContain(write);
    }
    expect(source).not.toContain("period_snapshot");
  });

  it("lets the reports index fail independently from the frozen history", () => {
    expect(source).toContain("export async function readCurrentReport");
    expect(source).toContain('return { ok: false, report: null }');
  });

  it("reuses the engine rather than recomputing anything", () => {
    expect(source).toContain("buildPeriodSnapshot");
    expect(source).toContain("closed: false");
    expect(source).toContain('source: "live"');
    // Home's memoized assembly is the single source â€” a second read path could
    // drift from the cockpit the user just looked at.
    expect(source).toContain("getReportParts");
  });

  it("renders the live variant of the one shared template", () => {
    const page = readFileSync(
      path.join(process.cwd(), "app/(app)/relatorios/agora/page.tsx"),
      "utf8",
    );
    expect(page).toContain('variant="live"');
    expect(page).toContain('export const dynamic = "force-dynamic"');
    expect(reportSheetSource).toContain("copy.overviewLive");
    expect(reportSheetSource).toContain("showProjection");
  });
});