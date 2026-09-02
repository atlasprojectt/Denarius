import Link from "next/link";
import { LogoWordmark } from "@/components/domain/logo";
import { Button } from "@/components/ui/button";
import type { VerdictStatus } from "@/lib/engine/verdict";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { reportDate, reportDateTime, reportMonth } from "@/lib/reports/format";
import type { ReportRenderMode } from "@/lib/reports/mode";
import type { PeriodSnapshot } from "@/lib/snapshot/build";
import { copy, reportStatus } from "../copy";
import { ReportViewer } from "./report-viewer";

// Shown when the live report data cannot be assembled (provider/RLS failure,
// transient sync error). A data-fetch failure is recoverable and distinct from
// a programming error in the document render — the latter still throws and
// surfaces through the normal error path. The error itself is logged server-
// side (see agora/page.tsx) so it is never lost, only kept out of the user's
// face.
export function ReportUnavailable() {
  return (
    <div className="report-unavailable" data-report-unavailable>
      <p>{copy.previewUnavailable}</p>
      <Button asChild variant="outline" size="sm">
        <Link href="/relatorios/agora">{copy.retry}</Link>
      </Button>
    </div>
  );
}

const providerName: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

const FX_FORMAT = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export type ReportSheetData = PeriodSnapshot & { companyName: string };
export type ReportVariant = "closed" | "live";

function fxLabel(report: ReportSheetData, live: boolean): string {
  if (report.frozenFxRate !== null) {
    return copy.fx(
      FX_FORMAT.format(report.frozenFxRate),
      report.fxRateSource ?? "—",
      report.fxRateDate ? reportDate(`${report.fxRateDate}T12:00:00Z`) : "—",
    );
  }
  if (!report.fxMissing) return copy.fxNotNeeded;
  return live ? copy.fxMissingLive : copy.fxMissing;
}

function safeFilename(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "empresa";
}
function displayMoney(value: number | null, currency: string): string {
  return value === null ? copy.unavailable : money(value, currency);
}

function SectionTitle({
  number,
  children,
}: {
  number?: number;
  children: React.ReactNode;
}) {
  return (
    <h2 className="report-section-title" data-print-heading>
      {number !== undefined && (
        <span className="report-section-number" aria-hidden>
          {number}.
        </span>
      )}
      <span>{children}</span>
    </h2>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-summary-row" data-print-keep>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StatusLabel({
  status,
  children,
}: {
  status: VerdictStatus;
  children: React.ReactNode;
}) {
  return (
    <span className={`report-status report-status-${status}`}>
      <span aria-hidden />
      {children}
    </span>
  );
}

export function ReportSheet({
  report,
  variant,
  mode = "screen",
}: {
  report: ReportSheetData;
  variant: ReportVariant;
  mode?: ReportRenderMode;
}) {
  const live = variant === "live";
  const month = reportMonth(report.periodMonth);
  const stamp = live
    ? `${copy.generatedAt(reportDateTime(report.closedAt))} · ${copy.dayOfPeriod(
        report.dayOfPeriod,
        report.daysInPeriod,
        report.monthLabel,
      )}`
    : copy.closedAt(reportDate(report.closedAt));
  const documentStamp = live
    ? `${reportDateTime(report.closedAt)} · ${copy.dayOfPeriod(
        report.dayOfPeriod,
        report.daysInPeriod,
        report.monthLabel,
      )}`
    : reportDate(report.closedAt);
  const fx = fxLabel(report, live);
  const seats = report.breakdown.seats;
  const unattributed = report.breakdown.unattributed;
  const showProjection = live && report.budgetAmount !== null;

  const caveats = [
    {
      key: "uncosted",
      label: copy.caveatLabels.uncosted,
      value: report.hasUncosted
        ? copy.caveatText.uncosted
        : copy.caveatText.costed,
    },
    {
      key: "reconciliation",
      label: copy.caveatLabels.reconciliation,
      value: report.reconciliationOk
        ? copy.caveatText.reconciled
        : copy.caveatText.reconciliationGap,
    },
    {
      key: "fx",
      label: copy.caveatLabels.fx,
      value: report.fxMissing
        ? live
          ? copy.caveatText.fxMissingLive
          : copy.caveatText.fxMissing
        : report.frozenFxRate === null
          ? copy.caveatText.fxNotNeeded
          : live
            ? copy.caveatText.fxPresentLive
            : copy.caveatText.fxPresent,
    },
    {
      key: "sync",
      label: copy.caveatLabels.sync,
      value: report.staleSync
        ? live
          ? copy.caveatText.staleLive
          : copy.caveatText.stale
        : live
          ? copy.caveatText.freshLive
          : copy.caveatText.fresh,
    },
  ];

  // One semantic document feeds screen, expanded view, browser print and the
  // server-generated PDF. The grouping wrappers are editorial, not a promise
  // of a fixed physical page count: long tables paginate naturally.
  const document = (
      <table className="report-print-frame" role="presentation" data-report-sheet>
        <tbody>
          <tr>
            <td>
              <div className="report-page" data-report-page="1">
                <header className="report-document-header" data-report-section="header">
                  <div className="report-document-brand">
                    <LogoWordmark className="report-header-wordmark" />
                    <p>{copy.documentTitle}</p>
                  </div>
                  <div className="report-document-period">
                    <strong>{month}</strong>
                    <span>{report.companyName}</span>
                  </div>
                  <dl className="report-document-meta">
                    <div>
                      <dt>{live ? copy.generated : copy.closed}</dt>
                      <dd>{documentStamp}</dd>
                    </div>
                    <div>
                      <dt>{copy.currencyLabel}</dt>
                      <dd>{report.currency}</dd>
                    </div>
                    <div>
                      <dt>{copy.fxLabel}</dt>
                      <dd>{fx}</dd>
                    </div>
                  </dl>
                </header>
                <div className="report-print-body">
                  <section
                    className="report-section report-summary"
                    data-print-keep
                    data-report-section="summary"
                  >
                    <SectionTitle>{copy.summaryTitle}</SectionTitle>
                    <dl className="report-summary-metrics">
                      <Metric
                        label={live ? copy.spentTitleLive : copy.spentTitle}
                        value={displayMoney(report.combinedAmount, report.currency)}
                      />
                      <Metric
                        label={copy.budget}
                        value={displayMoney(report.budgetAmount, report.currency)}
                      />
                      <Metric
                        label={copy.utilization}
                        value={
                          report.pctSpent === null
                            ? copy.unavailable
                            : percent(report.pctSpent)
                        }
                      />
                      {showProjection && (
                        <Metric
                          label={copy.projection}
                          value={
                            report.projection === null
                              ? copy.projectionCollecting
                              : money(report.projection, report.currency)
                          }
                        />
                      )}
                    </dl>
                    <div
                      className={`report-verdict report-verdict-${
                        report.verdictStatus ?? "neutral"
                      }`}
                    >
                      {report.verdictStatus && (
                        <StatusLabel status={report.verdictStatus}>
                          {reportStatus[report.verdictStatus]}
                        </StatusLabel>
                      )}
                      <p>{report.verdictSentence ?? copy.noVerdict}</p>
                    </div>
                  </section>

                  <section
                    className="report-section"
                    data-report-section="overview"
                  >
                    <SectionTitle number={1}>
                      {copy.overviewTitle}
                    </SectionTitle>
                    <p className="report-section-copy">
                      {live
                        ? copy.overviewLive(
                            report.dayOfPeriod,
                            report.daysInPeriod,
                            report.monthLabel,
                          )
                        : copy.overviewClosed(report.monthLabel)}
                    </p>
                    {live && report.projection === null && showProjection && (
                      <p className="report-method-note">
                        {copy.projectionCollectingHint}
                      </p>
                    )}
                  </section>

                  <section
                    className="report-section"
                    data-report-section="providers"
                  >
                    <SectionTitle number={2}>
                      {copy.providersSectionTitle}
                    </SectionTitle>
                    {report.breakdown.providers.length === 0 ? (
                      <p className="report-empty">{copy.providerEmpty}</p>
                    ) : (
                      <div className="report-table-wrap">
                        <table className="report-data-table" data-report-table>
                          <thead>
                            <tr>
                              <th scope="col">{copy.provider}</th>
                              <th scope="col">{report.currency}</th>
                              <th scope="col">{copy.usd}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.breakdown.providers.map((provider) => (
                              <tr key={provider.provider}>
                                <th scope="row">
                                  {providerName[provider.provider] ?? provider.provider}
                                </th>
                                <td className="report-number">
                                  {displayMoney(provider.display, report.currency)}
                                </td>
                                <td className="report-number">
                                  {money(provider.usd, "USD")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <section
                    className="report-section"
                    data-report-section="teams"
                  >
                    <SectionTitle number={3}>
                      {copy.teamsSectionTitle}
                    </SectionTitle>
                    {report.breakdown.teams.length === 0 ? (
                      <p className="report-empty">{copy.teamsEmpty}</p>
                    ) : (
                      <div className="report-table-wrap">
                        <table className="report-data-table" data-report-table>
                          <thead>
                            <tr>
                              <th scope="col">{copy.team}</th>
                              <th scope="col">{copy.spend}</th>
                              <th scope="col">{copy.budget}</th>
                              <th scope="col">{copy.utilization}</th>
                              <th scope="col">{copy.status}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.breakdown.teams.map((team) => (
                              <tr key={team.teamId}>
                                <th scope="row">{team.teamName}</th>
                                <td className="report-number">
                                  {displayMoney(team.spend, report.currency)}
                                </td>
                                <td className="report-number">
                                  {team.budget === null
                                    ? copy.noBudget
                                    : money(team.budget, report.currency)}
                                </td>
                                <td className="report-number">
                                  {team.pctSpent === null
                                    ? copy.dash
                                    : percent(team.pctSpent)}
                                </td>
                                <td>
                                  {team.status ? (
                                    <StatusLabel status={team.status}>
                                      {reportStatus[team.status]}
                                    </StatusLabel>
                                  ) : (
                                    <span className="report-status report-status-neutral">
                                      <span aria-hidden />
                                      {copy.noBudget}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </div>
              </div>
              <div className="report-page" data-report-page="2">
                <div className="report-print-body">
                  <section
                    className="report-section"
                    data-report-section="subscriptions"
                  >
                    <SectionTitle number={4}>
                      {copy.subscriptionsTitle}
                    </SectionTitle>
                    {!seats.available ? (
                      <p className="report-empty">{copy.seatsUnavailable}</p>
                    ) : seats.subscriptions.length === 0 ? (
                      <p className="report-empty">{copy.subscriptionsEmpty}</p>
                    ) : (
                      <div className="report-table-wrap">
                        <table className="report-data-table" data-report-table>
                          <thead>
                            <tr>
                              <th scope="col">{copy.subscription}</th>
                              <th scope="col">{copy.allocation}</th>
                              <th scope="col">{copy.seatQuantity}</th>
                              <th scope="col">{copy.monthlyCost}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {seats.subscriptions.map((subscription, index) => (
                              <tr
                                key={`${subscription.tool}-${subscription.teamId ?? "shared"}-${index}`}
                              >
                                <th scope="row">{subscription.tool}</th>
                                <td>
                                  {subscription.teamName ?? copy.companyWide}
                                </td>
                                <td className="report-number">
                                  {subscription.seatCount}
                                </td>
                                <td className="report-number">
                                  {money(subscription.monthlyTotal, report.currency)}
                                </td>
                              </tr>
                            ))}
                            <tr className="report-total-row">
                              <th scope="row" colSpan={3}>
                                {copy.totalSubscriptions}
                              </th>
                              <td className="report-number">
                                {displayMoney(seats.total, report.currency)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <section
                    className="report-section"
                    data-report-section="unattributed"
                  >
                    <SectionTitle number={5}>
                      {copy.unattributedSectionTitle}
                    </SectionTitle>
                    <div className="report-table-wrap">
                      <table className="report-data-table report-cost-table" data-report-table>
                        <thead>
                          <tr>
                            <th scope="col">{copy.costType}</th>
                            <th scope="col">{copy.value}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <th scope="row">{copy.api}</th>
                            <td className="report-number">
                              {money(unattributed.apiUsd, "USD")}
                            </td>
                          </tr>
                          <tr>
                            <th scope="row">{copy.sharedSeats}</th>
                            <td className="report-number">
                              {displayMoney(unattributed.seats, report.currency)}
                            </td>
                          </tr>
                          <tr className="report-total-row">
                            <th scope="row">{copy.totalUnattributed}</th>
                            <td className="report-number">
                              {displayMoney(unattributed.display, report.currency)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section
                    className="report-section report-caveats"
                    data-report-section="caveats"
                  >
                    <SectionTitle number={6}>
                      {copy.dataQualityTitle}
                    </SectionTitle>
                    <p className="report-section-copy">
                      {live ? copy.caveatsDescriptionLive : copy.caveatsDescription}
                    </p>
                    <ol className="report-notes">
                      {caveats.map((caveat) => (
                        <li key={caveat.key} data-print-keep>
                          <strong>{caveat.label}</strong>
                          <p>{caveat.value}</p>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
                <div className="report-brand-footer">
                  <LogoWordmark monochrome className="report-footer-wordmark" />
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    );

  if (mode === "pdf") {
    return <div className="report-print-source">{document}</div>;
  }

  const period = report.periodMonth.slice(0, 7);
  const pdfUrl = live ? "/api/relatorios/agora/pdf" : `/api/relatorios/${period}/pdf`;
  const downloadFilename = `denarius-relatorio-${safeFilename(`${report.companyName}-${period}`)}.pdf`;

  return (
    <>
      <ReportViewer
        title={month}
        meta={`${stamp} · ${copy.currency(report.currency)}`}
        pdfUrl={pdfUrl}
        downloadFilename={downloadFilename}
        reportDocument={document}
      />
      <div className="report-print-source" aria-hidden>
        {document}
      </div>
    </>
  );
}
