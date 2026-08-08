import { RiInformationLine, RiSubtractLine } from "@remixicon/react";

import { BudgetBar } from "@/components/domain/budget-bar";
import { Notice } from "@/components/domain/notice";
import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { RankedTickList } from "@/components/domain/ranked-tick-list";
import { StateBadge } from "@/components/domain/state-badge";
import { StatusPill } from "@/components/domain/status-pill";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { reportDate, reportDateTime, reportMonth } from "@/lib/reports/format";
import type { PeriodSnapshot } from "@/lib/snapshot/build";
import { copy, reportStatus } from "../copy";
import { PrintButton } from "./print-button";

// THE executive report template — one component, two periods (#95, #96).
//
// A closed month and the month in flight are the same document: same sections
// in the same order, same units, same caveats, same A4 geometry. Only the tense
// changes, so the CEO who prints a partial in the middle of August recognises
// it instantly when the closed August arrives. Keeping one template is what
// guarantees that; a second renderer would drift.
//
// The live variant adds exactly three things and nothing else: a notice that
// the month has not closed, the close projection beside the spend, and the
// present-tense wording of the caveats. Every number — including the projection
// — comes from `buildPeriodSnapshot`; this component only formats.

const providerName: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

const FX_FORMAT = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export type ReportSheetData = PeriodSnapshot & { companyName: string };

/** "closed" documents a frozen month; "live" describes the running one. */
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

function displayMoney(value: number | null, currency: string): string {
  return value === null ? copy.unavailable : money(value, currency);
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-sm font-medium tracking-tight">
      {children}
    </h2>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export function ReportSheet({
  report,
  variant,
}: {
  report: ReportSheetData;
  variant: ReportVariant;
}) {
  const live = variant === "live";
  const month = reportMonth(report.periodMonth);
  // Both variants stamp `closedAt`; for a live report that instant is "now".
  const stamp = live
    ? `${copy.generatedAt(reportDateTime(report.closedAt))} · ${copy.dayOfPeriod(
        report.dayOfPeriod,
        report.daysInPeriod,
        report.monthLabel,
      )}`
    : copy.closedAt(reportDate(report.closedAt));
  const fx = fxLabel(report, live);
  const providerTotal = report.breakdown.providers.reduce(
    (sum, provider) => sum + provider.usd,
    0,
  );
  const providerRows = report.breakdown.providers.map((provider) => ({
    key: provider.provider,
    label: providerName[provider.provider] ?? provider.provider,
    value:
      provider.display === null
        ? money(provider.usd, "USD")
        : `${money(provider.display, report.currency)} · ${money(provider.usd, "USD")}`,
    share: providerTotal === 0 ? 0 : provider.usd / providerTotal,
  }));
  const seats = report.breakdown.seats;
  const unattributed = report.breakdown.unattributed;
  // A projection only exists where a budget does. Before day 5 the engine
  // returns null and we say so rather than extrapolating four days into a month
  // (invariant #5).
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

  return (
    <PageContainer
      variant="wide"
      className="report-sheet gap-6"
      data-report-sheet
    >
      <div className="report-screen-header" data-report-section="header">
        <PageHeader
          title={`${report.companyName} · ${month}`}
          description={live ? copy.liveReportDescription : copy.reportDescription}
          backHref="/relatorios"
          backLabel={copy.back}
          actions={<PrintButton />}
          meta={`${stamp} · ${copy.currency(report.currency)}`}
        />
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">{fx}</p>
      </div>

      <div className="report-running-header" aria-hidden>
        <div className="flex items-baseline justify-between gap-6">
          <strong>{report.companyName}</strong>
          <span>{month}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-4 text-[9px] text-neutral-600">
          <span>{`${stamp} · ${copy.currency(report.currency)}`}</span>
          <span>{fx}</span>
        </div>
      </div>

      {live && (
        // Neutral, not a semaphore: green/amber/red belong to budget status
        // alone (principle #5), and an unfinished month is not a problem — it
        // is a fact about the document. The shared `Notice` is the app's
        // disclosure voice; the section wrapper carries the print hooks.
        <section className="report-section" data-report-section="partial">
          <Notice icon={<RiInformationLine aria-hidden />} title={copy.partialTitle}>
            {copy.partialBody}
          </Notice>
        </section>
      )}

      <section
        aria-labelledby="report-verdict"
        className="report-section"
        data-report-section="verdict"
      >
        <Card>
          <CardHeader>
            <CardTitle>
              <SectionTitle id="report-verdict">{copy.verdictTitle}</SectionTitle>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-3">
            {report.verdictStatus && (
              <StatusPill
                status={report.verdictStatus}
                label={reportStatus[report.verdictStatus]}
              />
            )}
            <p className="text-sm/relaxed">
              {report.verdictSentence ?? copy.noVerdict}
            </p>
          </CardContent>
        </Card>
      </section>

      <section
        aria-labelledby="report-spend"
        className="report-section"
        data-report-section="spend"
      >
        <Card>
          <CardHeader>
            <CardTitle>
              <SectionTitle id="report-spend">
                {live ? copy.spentTitleLive : copy.spentTitle}
              </SectionTitle>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
              {displayMoney(report.combinedAmount, report.currency)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              {report.combinedAmount !== null && report.budgetAmount !== null
                ? copy.spentOfBudget(
                    money(report.combinedAmount, report.currency),
                    money(report.budgetAmount, report.currency),
                  )
                : copy.noBudget}
            </p>
            <div className="mt-4">
              {report.pctSpent !== null && report.verdictStatus !== null ? (
                <BudgetBar
                  pctSpent={report.pctSpent}
                  pctProjected={
                    report.projection !== null && report.budgetAmount
                      ? report.projection / report.budgetAmount
                      : null
                  }
                  status={report.verdictStatus}
                />
              ) : (
                <div className="h-2.5 w-full rounded-sm bg-muted" />
              )}
            </div>
            {showProjection && (
              <dl className="mt-4 border-t pt-3">
                <Metric
                  label={copy.projection}
                  value={
                    report.projection === null
                      ? copy.projectionCollecting
                      : money(report.projection, report.currency)
                  }
                />
                {report.projection === null && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {copy.projectionCollectingHint}
                  </p>
                )}
              </dl>
            )}
          </CardContent>
        </Card>
      </section>

      <section
        aria-labelledby="report-providers"
        className="report-section"
        data-report-section="providers"
      >
        <Card>
          <CardHeader>
            <CardTitle>
              <SectionTitle id="report-providers">
                {live ? copy.providerTitleLive : copy.providerTitle}
              </SectionTitle>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {providerRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">{copy.providerEmpty}</p>
            ) : (
              <RankedTickList rows={providerRows} />
            )}
          </CardContent>
        </Card>
      </section>

      <section
        aria-labelledby="report-teams"
        className="report-section"
        data-report-section="teams"
      >
        <Card className="gap-0 py-0">
          <div className="border-b border-border/60 px-4 py-3">
            <SectionTitle id="report-teams">{copy.teamsTitle}</SectionTitle>
          </div>
          {report.breakdown.teams.length === 0 ? (
            <p className="px-4 py-5 text-xs text-muted-foreground">
              {copy.teamsEmpty}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-[11px] text-muted-foreground">
                    <th className="px-4 py-2 font-medium">{copy.team}</th>
                    <th className="px-3 py-2 font-medium">{copy.spend}</th>
                    <th className="px-3 py-2 font-medium">{copy.budget}</th>
                    <th className="px-3 py-2 font-medium">{copy.percent}</th>
                    <th className="px-4 py-2 font-medium">{copy.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {report.breakdown.teams.map((team) => (
                    <tr key={team.teamId}>
                      <td className="px-4 py-3 font-medium">{team.teamName}</td>
                      <td className="px-3 py-3 tabular-nums">
                        {displayMoney(team.spend, report.currency)}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {team.budget === null
                          ? copy.noBudget
                          : money(team.budget, report.currency)}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {team.pctSpent === null ? "—" : percent(team.pctSpent)}
                      </td>
                      <td className="px-4 py-3">
                        {team.status ? (
                          <StatusPill
                            status={team.status}
                            label={reportStatus[team.status]}
                          />
                        ) : (
                          <StateBadge icon={RiSubtractLine} tone="neutral">
                            {copy.noBudget}
                          </StateBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section
        aria-labelledby="report-seats-unattributed"
        className="report-section"
        data-report-section="seats-unattributed"
      >
        <SectionTitle id="report-seats-unattributed">
          {copy.seatsAndUnattributed}
        </SectionTitle>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{copy.seats}</CardTitle>
              <CardDescription>
                {!seats.available
                  ? copy.seatsUnavailable
                  : live
                    ? copy.seatCountLive(seats.subscriptions.length)
                    : copy.seatCount(seats.subscriptions.length)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {displayMoney(seats.total, report.currency)}
              </p>
              {seats.subscriptions.length > 0 && (
                <ul className="mt-3 divide-y divide-border/60">
                  {seats.subscriptions.map((subscription, index) => (
                    <li
                      key={`${subscription.tool}-${subscription.teamId ?? "shared"}-${index}`}
                      className="flex justify-between gap-3 py-2"
                    >
                      <span className="min-w-0 truncate">{subscription.tool}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {money(subscription.monthlyTotal, report.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{copy.unattributed}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {displayMoney(unattributed.display, report.currency)}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <Metric label={copy.api} value={money(unattributed.apiUsd, "USD")} />
                <Metric
                  label={copy.sharedSeats}
                  value={displayMoney(unattributed.seats, report.currency)}
                />
              </dl>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer
        aria-labelledby="report-caveats"
        className="report-section"
        data-report-section="caveats"
      >
        <Card>
          <CardHeader>
            <CardTitle>
              <SectionTitle id="report-caveats">
                {live ? copy.caveatsTitleLive : copy.caveatsTitle}
              </SectionTitle>
            </CardTitle>
            <CardDescription>
              {live ? copy.caveatsDescriptionLive : copy.caveatsDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              {caveats.map((caveat) => (
                <div key={caveat.key} className="rounded-lg border p-3">
                  <dt>
                    <StateBadge icon={RiInformationLine} tone="neutral">
                      {caveat.label}
                    </StateBadge>
                  </dt>
                  <dd className="mt-2 text-xs/relaxed text-muted-foreground">
                    {caveat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </footer>
    </PageContainer>
  );
}
