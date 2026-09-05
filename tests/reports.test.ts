import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { isReportPath } from "@/lib/reports/path";

const reportDocumentSource = readFileSync(
  path.join(process.cwd(), "app/(app)/relatorios/_components/report-document.tsx"),
  "utf8",
);
const reportsIndexSource = readFileSync(
  path.join(process.cwd(), "app/(app)/relatorios/page.tsx"),
  "utf8",
);
const previewDialogSource = readFileSync(
  path.join(process.cwd(), "app/(app)/relatorios/_components/report-preview-dialog.tsx"),
  "utf8",
);
const hostSource = readFileSync(
  path.join(process.cwd(), "app/(app)/relatorios/_components/reports-host.tsx"),
  "utf8",
);
const fileRowSource = readFileSync(
  path.join(process.cwd(), "app/(app)/relatorios/_components/file-row.tsx"),
  "utf8",
);
const actionsSource = readFileSync(
  path.join(process.cwd(), "lib/reports/actions.ts"),
  "utf8",
);
const searchSource = readFileSync(
  path.join(process.cwd(), "lib/search/providers/reports.ts"),
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
  it("recognizes the report surfaces so the shell skips live cockpit reads", () => {
    expect(isReportPath("/relatorios")).toBe(true);
    expect(isReportPath("/relatorios/2026-07")).toBe(true);
    expect(isReportPath("/relatorios-falso")).toBe(false);
    expect(isReportPath("/times")).toBe(false);
  });

  it("keeps print isolated and allows long sections to paginate naturally", () => {
    const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    const print = css.slice(css.indexOf("@media print"));

    expect(print).toContain('[data-slot="sidebar-container"]');
    expect(print).toContain("[data-app-header]");
    expect(print).toContain('[data-slot="dialog-overlay"]');
    expect(print).toContain("color-scheme: light");
    expect(print).not.toContain(".report-page + .report-page");
    expect(print).not.toContain("break-before: page");
    expect(print).toContain(".report-document-header");
    expect(print).toContain("break-after: avoid-page");
    expect(print).toContain(".report-brand-footer");
    expect(print).toContain("break-inside: avoid");
    expect(print).not.toContain("report-print-header");
    expect(print).not.toContain("report-print-footer");
    expect(print).toContain("[data-print-keep]");
    expect(print).toContain(".report-section");
    expect(print).toContain("break-inside: auto");
    expect(print).not.toContain("position: fixed");
    expect(print).not.toContain("top: -15mm");
  });

  it("keeps the fixed executive sections in the same source order", () => {
    // ONE document serves the dialog, print and the headless PDF alike — that
    // is what makes every output recognizable as the same document.
    const positions = [
      "header",
      "summary",
      "overview",
      "providers",
      "teams",
      "subscriptions",
      "unattributed",
      "caveats",
    ].map((section) => reportDocumentSource.indexOf(`data-report-section="${section}"`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("keeps the print hooks on the shared document", () => {
    expect(reportDocumentSource).toContain("data-report-sheet");
    expect(reportDocumentSource).toContain("report-document-header");
    expect(reportDocumentSource).toContain("report-brand-footer");
    expect(reportDocumentSource).toContain("<LogoWordmark");
    expect(reportDocumentSource).toContain("report-print-frame");
    expect(reportDocumentSource).toContain('data-report-page="1"');
    expect(reportDocumentSource).toContain('data-report-page="2"');
    expect(reportDocumentSource).toContain("report-print-body");
    expect(reportDocumentSource).toContain("data-print-keep");
    expect(reportDocumentSource).not.toContain("report-print-header");
    expect(reportDocumentSource).not.toContain("report-print-footer");
  });

  it("keeps both preview leaves at the A4 ratio", () => {
    const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain(".report-preview-paper .report-page");
    expect(css).toContain("aspect-ratio: 210 / 297");
  });

  it("orders the preview header as close, context, then actions", () => {
    const close = previewDialogSource.indexOf("copy.previewClose");
    const meta = previewDialogSource.indexOf("<DialogTitle>");
    const actions = previewDialogSource.indexOf("report-preview-dialog-actions");
    expect(close).toBeGreaterThan(-1);
    expect([close, meta, actions]).toEqual(
      [...[close, meta, actions]].sort((a, b) => a - b),
    );
  });

  it("keeps the preview free of PDF readers and popups", () => {
    for (const source of [previewDialogSource, reportDocumentSource]) {
      expect(source).not.toContain("pagedjs");
      expect(source).not.toContain("pdfjs-dist");
      expect(source).not.toContain("contentWindow?.print");
      expect(source).not.toContain("window.open(");
    }
    expect(previewDialogSource).toContain("window.print()");
    expect(previewDialogSource).toContain("requestAnimationFrame");
    expect(previewDialogSource).toContain("onClose");
    expect(previewDialogSource).toContain('from "motion/react"');
    expect(previewDialogSource).toContain("useReducedMotion");
    expect(previewDialogSource).toContain("<motion.div");
  });

  it("keeps print and download as the dialog's actions", () => {
    expect(previewDialogSource).toContain("copy.print");
    expect(previewDialogSource).toContain("copy.downloadPdf");
    expect(previewDialogSource).toContain("copy.preparingPdf");
  });
});

describe("file-centre flow (agora / fechamento / history)", () => {
  it("orders the host as agora, closing, then history", () => {
    const agoraAt = hostSource.indexOf("copy.liveCardCta");
    const closingAt = hostSource.indexOf("copy.closingTitle");
    const historyAt = hostSource.indexOf("copy.closedListTitle");
    expect(agoraAt).toBeGreaterThan(-1);
    expect(closingAt).toBeGreaterThan(agoraAt);
    expect(historyAt).toBeGreaterThan(closingAt);
  });

  it("keeps the index a summary shell: no live reads, no preview links", () => {
    expect(reportsIndexSource).toContain("listMonthlyReports");
    expect(reportsIndexSource).toContain("closingCardState");
    expect(reportsIndexSource).toContain("<ReportsHost");
    expect(reportsIndexSource).not.toContain("readCurrentReport");
    expect(reportsIndexSource).not.toContain("LIVE_REPORT_PATH");
    expect(reportsIndexSource).not.toContain("/relatorios/agora");
  });

  it("keeps file rows quiet: viewing opens, actions live in the dialog", () => {
    expect(fileRowSource).not.toContain("Imprimir");
    expect(fileRowSource).not.toContain("Baixar PDF");
    expect(fileRowSource).toContain("RiArrowRightSLine");
    expect(fileRowSource).toContain("RiLockLine");
    expect(previewDialogSource).toContain("copy.print");
    expect(previewDialogSource).toContain("copy.downloadPdf");
  });

  it("replaces the on-demand file instead of accumulating temporaries", () => {
    expect(hostSource).toContain("AGORA_FILE_KEY");
    expect(hostSource).toContain("localStorage.setItem(AGORA_FILE_KEY, stamp)");
    expect(hostSource).toContain("copy.agoraFileStamp");
  });

  it("says the on-demand file never becomes a closing", () => {
    expect(hostSource).toContain("AGORA_FILE_KEY");
    expect(hostSource).not.toContain("copy.liveCardNote");
  });

  it("features the closing on snapshots and dates; newness stays browser-local", () => {
    // The server cannot read the seen set — featuring comes from frozen
    // snapshots plus the five-day window; "Novo" is only the sidebar dot and
    // the featured file badge until opened.
    expect(hostSource).toContain("copy.closingLockedIn");
    expect(hostSource).toContain("copy.closingAvailableNow");
    expect(hostSource).toContain("copy.closingNew");
    // Verdict pills stay on the history rows only — verdicts ARE budget
    // status, so the semaphore still belongs to them and nothing else.
    expect(hostSource).toContain("StatusPill");
  });

  it("marks a featured closing seen when its preview opens", () => {
    expect(hostSource).toContain("markSeen");
    expect(hostSource).toContain("REPORTS_SEEN_EVENT");
  });

  it("prints a frozen copy: closing the dialog never takes the paper with it", () => {
    expect(hostSource).toContain("printDoc");
    expect(hostSource).toContain("afterprint");
    expect(previewDialogSource).toContain("data-printing");
  });

  it("flags the sidebar destination with a dot, never a counter or semaphore", () => {
    const navGroupSource = readFileSync(
      path.join(process.cwd(), "components/domain/nav-group.tsx"),
      "utf8",
    );
    const appSidebarSource = readFileSync(
      path.join(process.cwd(), "components/domain/app-sidebar.tsx"),
      "utf8",
    );
    expect(navGroupSource).toContain("data-sidebar-badge");
    expect(navGroupSource).not.toContain("StatusPill");
    expect(appSidebarSource).toContain("latestReportPeriod");
    expect(appSidebarSource).toContain("useNewReportBadge");
    expect(appSidebarSource).toContain("closingCardState");
  });

  it("fetches preview data through guarded server actions, never a REST route", () => {
    expect(actionsSource).toContain('"use server"');
    expect(actionsSource).toContain("getLivePreview");
    expect(actionsSource).toContain("getClosedPreview");
    expect(actionsSource).toContain("monthlyReport");
    expect(actionsSource).toContain("preview-unavailable");
    expect(actionsSource).not.toContain("createAdminClient");
    expect(actionsSource).not.toContain("fetch(");
    expect(hostSource).toContain("getLivePreview");
    expect(hostSource).toContain("getClosedPreview");
  });

  it("sends search results to the file list, not to preview routes", () => {
    expect(searchSource).not.toContain("/relatorios/${");
    expect(searchSource).toContain('"/relatorios"');
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

  it("lets the preview action fail without breaking the file list", () => {
    expect(actionsSource).toContain("preview-unavailable");
    expect(actionsSource).toContain("logThrown");
  });

  it("reuses the engine rather than recomputing anything", () => {
    expect(source).toContain("buildPeriodSnapshot");
    expect(source).toContain("closed: false");
    expect(source).toContain('source: "live"');
    // Home's memoized assembly is the single source â€” a second read path could
    // drift from the cockpit the user just looked at.
    expect(source).toContain("getReportParts");
  });

  it("renders the live variant of the one shared document", () => {
    const page = readFileSync(
      path.join(process.cwd(), "app/(app)/relatorios/agora/page.tsx"),
      "utf8",
    );
    expect(page).toContain('variant="live"');
    expect(page).toContain('export const dynamic = "force-dynamic"');
    expect(reportDocumentSource).toContain("copy.overviewLive");
    expect(reportDocumentSource).toContain("showProjection");
  });
});

describe("report preview resilience (P0 hardening)", () => {
  const pageSource = readFileSync(
    path.join(process.cwd(), "app/(app)/relatorios/agora/page.tsx"),
    "utf8",
  );

  it("does not let the live render endpoint throw unlogged", () => {
    // The data assembly is guarded and logged server-side; a failure reaches
    // the PDF/download error paths, never a half-rendered document.
    expect(pageSource).toContain("try {");
    expect(pageSource).toContain("await currentReport()");
    expect(pageSource).toContain('logThrown("report.current.read"');
  });

  it("renders a discreet fallback instead of an empty preview", () => {
    expect(previewDialogSource).toContain("copy.previewUnavailable");
    expect(previewDialogSource).toContain("copy.retry");
    expect(previewDialogSource).toContain("role=\"status\"");
  });

  it("keeps editorial groups ordered without forcing a physical page count", () => {
    const first = reportDocumentSource.indexOf('data-report-page="1"');
    const second = reportDocumentSource.indexOf('data-report-page="2"');
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);

    expect(reportDocumentSource).not.toContain("REPORT_PAGE_COUNT");
    const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    const print = css.slice(css.indexOf("@media print"));
    expect(print).not.toContain(".report-page + .report-page");
  });
});
