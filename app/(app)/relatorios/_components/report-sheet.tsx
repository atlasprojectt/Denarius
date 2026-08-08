import { RiInformationLine, RiSubtractLine } from "@remixicon/react";

import { BudgetBar } from "@/components/domain/budget-bar";
import { LogoMark } from "@/components/domain/logo";
import { Notice } from "@/components/domain/notice";
import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { StateBadge } from "@/components/domain/state-badge";
import { StatusPill } from "@/components/domain/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { composeReport, type ReportVariant } from "@/lib/reports/compose";
import { reportDate, reportDateTime, reportMonth } from "@/lib/reports/format";
import type { PeriodSnapshot } from "@/lib/snapshot/build";
import { copy, reportStatus } from "../copy";
import { PrintButton } from "./print-button";

// THE executive report — one template, two periods (#95, #96), composed by a
// deterministic algorithm (#97).
//
// This component renders a DECISION, it does not make one. `composeReport`
// decides what the document says, in what order inside each section, and which
// sections collapse; everything here is layout and labels. No arithmetic, no
// ranking, no phrasing of figures lives below this line.
//
// The spine is fixed and numbered (§1..§6) so that two periods are comparable —
// a reader must find "Composição do gasto" in the same place every month. The
// live variant adds exactly one thing to it: the notice that the period has not
// closed. Everything else differs only in tense.

const providerName: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

const FX_FORMAT = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export type ReportSheetData = PeriodSnapshot & { companyName: string };

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

function compositionLabel(id: string, label: string): string {
  if (id === "seats") return copy.seats;
  return providerName[label] ?? label;
}

/** A numbered section of the document. The number is the spine — it never moves. */
function Section({
  id,
  number,
  title,
  intro,
  children,
}: {
  id: string;
  number: number;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  const headingId = `report-${id}`;
  return (
    <section
      aria-labelledby={headingId}
      className="report-section"
      data-report-section={id}
    >
      <Card>
        <CardHeader>
          <CardTitle>
            <h2
              id={headingId}
              className="flex items-baseline gap-2 text-sm font-medium tracking-tight"
            >
              <span className="text-muted-foreground tabular-nums">{number}.</span>
              {title}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {intro && <p className="text-xs text-muted-foreground">{intro}</p>}
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="min-w-32 border-l pl-3">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
      {note && <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p>}
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
  const doc = composeReport(report, variant);
  const { currency } = report;
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
  const identity = `${stamp} · ${copy.currency(currency)}`;

  return (
    <PageContainer
      variant="wide"
      className="report-sheet gap-6"
      data-report-sheet
    >
      {/* Screen chrome only — hidden on paper, where the title block below and
          the running header take over. */}
      <div className="report-screen-header">
        <PageHeader
          title={`${report.companyName} · ${month}`}
          description={live ? copy.docKindLive : copy.docKindClosed}
          backHref="/relatorios"
          backLabel={copy.back}
          actions={<PrintButton />}
        />
      </div>

      {/* The document's own title block — printed, unlike the chrome above.
          A formal report identifies itself on its first page. */}
      <header className="report-title-block" data-report-section="title">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
          {copy.docKind}
        </p>
        <h1 className="mt-1 font-heading text-xl font-semibold tracking-tight">
          {report.companyName} · {month}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
          {report.verdictStatus && (
            <StatusPill
              status={report.verdictStatus}
              label={reportStatus[report.verdictStatus]}
            />
          )}
          <span>{live ? copy.docKindLive : copy.docKindClosed}</span>
          <span aria-hidden>·</span>
          <span>{identity}</span>
          <span aria-hidden>·</span>
          <span>{fx}</span>
        </div>
      </header>

      {/* Print-only bands. Fixed position puts them inside the @page margins,
          which is what makes them repeat on every sheet. */}
      <div className="report-running-header" aria-hidden>
        <div className="flex items-baseline justify-between gap-6">
          <strong>{report.companyName}</strong>
          <span>{month}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-4 text-[9px] text-neutral-600">
          <span>{identity}</span>
          <span>{fx}</span>
        </div>
      </div>
      <div className="report-running-footer" aria-hidden>
        <span className="flex items-center gap-1.5">
          <LogoMark className="h-2.5 w-auto" />
          <strong className="font-semibold">{copy.footerMark}</strong>
          <span>· {copy.footerTagline}</span>
        </span>
        <span>
          {report.companyName} · {month}
        </span>
      </div>

      {live && (
        // Neutral, not a semaphore: green/amber/red belong to budget status
        // alone (principle #5). This says "partial", not "bad".
        <section className="report-section" data-report-section="partial">
          <Notice icon={<RiInformationLine aria-hidden />} title={copy.partialTitle}>
            {copy.partialBody}
          </Notice>
        </section>
      )}

      {/* §1 — the conclusion, before the evidence. */}
      <Section id="summary" number={1} title={copy.sections.summary}>
        <p className="text-sm/relaxed font-medium">
          {doc.summary.lead ?? copy.noVerdict}
        </p>
        <dl className="flex flex-wrap gap-x-6 gap-y-3">
          {doc.summary.figures.map((figure) => (
            <Figure
              key={figure.id}
              label={copy.figures[figure.id]}
              value={figure.value}
              note={figure.note === "collecting" ? copy.figureCollecting : undefined}
            />
          ))}
        </dl>
        {doc.summary.highlights.length > 0 && (
          <ul className="grid gap-1.5 text-xs/relaxed text-muted-foreground">
            {doc.summary.highlights.map((highlight) => (
              <li key={highlight.id} className="flex gap-2">
                <span aria-hidden>—</span>
                <span>{highlight.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* §2 — the money. */}
      <Section id="position" number={2} title={copy.sections.position}>
        <div>
          <p className="text-4xl font-semibold tracking-tight tabular-nums">
            {displayMoney(report.combinedAmount, currency)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            {report.combinedAmount !== null && report.budgetAmount !== null
              ? copy.spentOfBudget(
                  money(report.combinedAmount, currency),
                  money(report.budgetAmount, currency),
                )
              : copy.noBudget}
          </p>
        </div>
        {report.pctSpent !== null && report.verdictStatus !== null ? (
          <div className="grid gap-2">
            <BudgetBar
              pctSpent={report.pctSpent}
              pctProjected={
                report.projection !== null && report.budgetAmount
                  ? report.projection / report.budgetAmount
                  : null
              }
              status={report.verdictStatus}
            />
            <p className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground tabular-nums">
              <span>{copy.elapsed(report.dayOfPeriod, report.daysInPeriod)}</span>
              <span aria-hidden>·</span>
              <span>{copy.consumed(percent(report.pctSpent))}</span>
            </p>
          </div>
        ) : (
          <div className="h-2.5 w-full rounded-sm bg-muted" />
        )}
        {live && report.budgetAmount !== null && report.projection === null && (
          <p className="text-[11px] text-muted-foreground">
            {copy.projectionCollectingHint}
          </p>
        )}
      </Section>

      {/* §3 — where the money came from. These rows close against §2. */}
      <Section
        id="composition"
        number={3}
        title={copy.sections.composition}
        intro={
          doc.emphasis.composition === "collapsed"
            ? undefined
            : doc.compositionBalances
              ? copy.compositionIntro
              : copy.compositionGap
        }
      >
        {doc.composition.length === 0 ? (
          <p className="text-xs text-muted-foreground">{copy.compositionEmpty}</p>
        ) : doc.emphasis.composition === "collapsed" ? (
          <p className="text-xs text-muted-foreground">
            {copy.compositionCollapsed(
              compositionLabel(doc.composition[0].id, doc.composition[0].label),
            )}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-[11px] text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{copy.source}</th>
                  <th className="py-2 pr-3 text-right font-medium">{copy.amount}</th>
                  <th className="py-2 text-right font-medium">
                    {copy.shareOfPeriod}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {doc.composition.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2.5 pr-3 font-medium">
                      {compositionLabel(row.id, row.label)}
                      {row.usd !== undefined && (
                        <span className="ml-2 font-normal text-muted-foreground tabular-nums">
                          {money(row.usd, "USD")}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {displayMoney(row.amount, currency)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {row.share === null ? "—" : percent(row.share)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-medium">
                  <td className="py-2.5 pr-3">{copy.total}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {displayMoney(report.combinedAmount, currency)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                    {doc.compositionBalances ? percent(1) : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {report.breakdown.seats.available &&
          report.breakdown.seats.subscriptions.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {copy.seats}: {copy.seatCount(report.breakdown.seats.subscriptions.length)}
            </p>
          )}
        {!report.breakdown.seats.available && (
          <p className="text-[11px] text-muted-foreground">
            {copy.seats}: {copy.seatsUnavailable}
          </p>
        )}
      </Section>

      {/* §4 — who spent it. Σ teams + Unattributed = §2 (invariant #3). */}
      <Section
        id="teams"
        number={4}
        title={copy.sections.teams}
        intro={doc.emphasis.teams === "collapsed" ? undefined : copy.teamsIntro}
      >
        {doc.emphasis.teams === "collapsed" ? (
          <p className="text-xs text-muted-foreground">{copy.teamsCollapsed}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-[11px] text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{copy.team}</th>
                  <th className="py-2 pr-3 font-medium">{copy.status}</th>
                  <th className="py-2 pr-3 text-right font-medium">{copy.spend}</th>
                  <th className="py-2 pr-3 text-right font-medium">
                    {copy.shareOfPeriod}
                  </th>
                  <th className="py-2 pr-3 text-right font-medium">{copy.budget}</th>
                  <th className="py-2 text-right font-medium">
                    {copy.percentOfBudget}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {doc.teams.map((team) => (
                  <tr key={team.teamId}>
                    <td className="py-2.5 pr-3 font-medium">{team.teamName}</td>
                    <td className="py-2.5 pr-3">
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
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {displayMoney(team.spend, currency)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">
                      {team.share === null ? "—" : percent(team.share)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">
                      {team.budget === null
                        ? copy.noBudget
                        : money(team.budget, currency)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {team.pctSpent === null ? "—" : percent(team.pctSpent)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td className="py-2.5 pr-3 font-medium">{copy.unattributed}</td>
                  <td className="py-2.5 pr-3 text-[11px] text-muted-foreground">
                    {copy.unattributedNote}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {displayMoney(doc.unattributed.amount, currency)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">
                    {doc.unattributed.share === null
                      ? "—"
                      : percent(doc.unattributed.share)}
                  </td>
                  <td className="py-2.5 pr-3" />
                  <td className="py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      {/* §5 — what points at a decision. Actions only while the period runs. */}
      <Section id="attention" number={5} title={copy.sections.attention}>
        {doc.emphasis.attention === "collapsed" ? (
          <p className="text-xs text-muted-foreground">{copy.attentionAllClear}</p>
        ) : (
          <>
            {doc.attention.observations.length > 0 && (
              <div className="grid gap-2">
                <h3 className="text-[11px] font-medium text-muted-foreground">
                  {copy.observedTitle}
                </h3>
                <ul className="grid gap-1.5 text-xs/relaxed">
                  {doc.attention.observations.map((observation) => (
                    <li key={observation.id} className="flex gap-2">
                      <span aria-hidden className="text-muted-foreground">
                        —
                      </span>
                      <span>{observation.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {doc.attention.actions.length > 0 && (
              <div className="grid gap-2">
                <h3 className="text-[11px] font-medium text-muted-foreground">
                  {copy.actionsTitle}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {copy.actionsIntro}
                </p>
                <ol className="grid gap-2">
                  {doc.attention.actions.map((action, index) => (
                    <li
                      key={action.id}
                      className="grid gap-0.5 rounded-lg border p-3 text-xs/relaxed"
                    >
                      <p className="font-medium">
                        <span className="mr-1.5 text-muted-foreground tabular-nums">
                          {index + 1}.
                        </span>
                        {action.title}
                      </p>
                      <p className="text-muted-foreground">{action.detail}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {copy.actionContext(action.context)}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </Section>

      {/* §6 — the annex. Method and caveats travel with the numbers. */}
      <Section
        id="annex"
        number={6}
        title={copy.sections.annex}
        intro={live ? copy.caveatsDescriptionLive : copy.caveatsDescription}
      >
        <dl className="grid gap-3 sm:grid-cols-2">
          {doc.annex.caveats.map((caveat) => (
            <div key={caveat.id} className="rounded-lg border p-3">
              <dt>
                <StateBadge icon={RiInformationLine} tone="neutral">
                  {copy.caveatLabels[caveat.id]}
                </StateBadge>
              </dt>
              <dd className="mt-2 text-xs/relaxed text-muted-foreground">
                {caveatText(caveat.id, caveat.flagged, report, live)}
              </dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-1.5">
          <h3 className="text-[11px] font-medium text-muted-foreground">
            {copy.methodTitle}
          </h3>
          <ul className="grid gap-1 text-[11px]/relaxed text-muted-foreground">
            {copy.method.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden>—</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </PageContainer>
  );
}

/** The caveat's own sentence: flagged or clean, present tense or past. */
function caveatText(
  id: "uncosted" | "reconciliation" | "fx" | "sync",
  flagged: boolean,
  report: ReportSheetData,
  live: boolean,
): string {
  const t = copy.caveatText;
  if (id === "uncosted") return flagged ? t.uncosted : t.costed;
  if (id === "reconciliation") return flagged ? t.reconciliationGap : t.reconciled;
  if (id === "fx") {
    if (flagged) return live ? t.fxMissingLive : t.fxMissing;
    if (report.frozenFxRate === null) return t.fxNotNeeded;
    return live ? t.fxPresentLive : t.fxPresent;
  }
  if (flagged) return live ? t.staleLive : t.stale;
  return live ? t.freshLive : t.fresh;
}
