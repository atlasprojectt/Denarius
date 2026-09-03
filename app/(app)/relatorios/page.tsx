import Link from "next/link";
import {
  RiArrowRightSLine,
  RiErrorWarningLine,
  RiFileChartLine,
  RiInformationLine,
} from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { StateBadge } from "@/components/domain/state-badge";
import { StatusPill } from "@/components/domain/status-pill";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { money } from "@/lib/money";
import {
  reportMonth,
  reportPeriodPath,
} from "@/lib/reports/format";
import { readCurrentReport } from "@/lib/reports/current";
import { LIVE_REPORT_PATH } from "@/lib/reports/path";
import { listMonthlyReports } from "@/lib/reports/queries";
import { copy } from "./copy";

function displayMoney(amount: number | null, currency: string) {
  return amount === null ? copy.unavailable : money(amount, currency);
}

export default async function ReportsPage() {
  const [read, current] = await Promise.all([
    listMonthlyReports(),
    readCurrentReport(),
  ]);

  return (
    <PageContainer variant="wide" className="gap-6">
      <PageHeader title={copy.indexTitle} description={copy.indexDescription} />

      {/* Rendered before and independently of the frozen list: the on-demand
          report is available from day one, including before the first close. */}
      <Card>
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-sm">{copy.liveCardTitle}</CardTitle>
          <CardDescription>
            {current.ok
              ? `${reportMonth(current.report.periodMonth)} · ${copy.liveDataThrough(
                  current.report.dayOfPeriod,
                  current.report.monthLabel,
                )}`
              : copy.liveCardUnavailable}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {current.ok ? (
            <div className="grid gap-2">
              <div className="grid gap-0.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {copy.currentSpend}
                </p>
                <p className="font-heading text-lg font-semibold tracking-tight tabular-nums">
                  {current.report.budgetAmount === null
                    ? copy.currentSpendWithoutBudget(
                        displayMoney(
                          current.report.combinedAmount,
                          current.report.currency,
                        ),
                      )
                    : copy.currentSpendOfBudget(
                        displayMoney(
                          current.report.combinedAmount,
                          current.report.currency,
                        ),
                        money(
                          current.report.budgetAmount,
                          current.report.currency,
                        ),
                      )}
                </p>
              </div>
              {current.report.verdictStatus ? (
                <StatusPill status={current.report.verdictStatus} />
              ) : (
                <StateBadge icon={RiInformationLine} tone="neutral">
                  {copy.verdictUnavailable}
                </StateBadge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.liveCardBody}</p>
          )}
          <Button asChild className="max-sm:min-h-11">
            <Link href={LIVE_REPORT_PATH}>
              <RiFileChartLine aria-hidden />
              {copy.liveCardCta}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-sm font-medium">
          {copy.closedListTitle}
        </h2>
        <p className="text-xs text-muted-foreground">
          {copy.closedListDescription}
        </p>
      </div>

      {!read.ok ? (
        <EmptyState
          icon={<RiErrorWarningLine />}
          title={copy.unavailableTitle}
          description={copy.unavailableDescription}
        />
      ) : read.reports.length === 0 ? (
        <EmptyState
          icon={<RiFileChartLine />}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      ) : (
        <Card className="gap-0 py-0">
          <div className="hidden grid-cols-[1.1fr_1fr_1fr_1.2fr_0.8fr_20px] gap-4 border-b border-border/60 px-4 py-2 text-[11px] font-medium text-muted-foreground lg:grid">
            <span>{copy.month}</span>
            <span>{copy.spend}</span>
            <span>{copy.budget}</span>
            <span>{copy.verdict}</span>
            <span>{copy.caveats}</span>
            <span aria-hidden />
          </div>
          <div className="divide-y divide-border/60">
            {read.reports.map((report) => {
              const month = reportMonth(report.periodMonth);
              return (
                <Link
                  key={report.periodMonth}
                  href={`/relatorios/${reportPeriodPath(report.periodMonth)}`}
                  aria-label={copy.openMonth(month)}
                  className="group grid min-h-16 gap-3 px-4 py-3 outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_1.2fr_0.8fr_20px] lg:items-center lg:gap-4"
                >
                  <span className="font-medium">{month}</span>
                  <span className="grid gap-0.5 tabular-nums">
                    <span className="text-[11px] text-muted-foreground lg:hidden">
                      {copy.spend}
                    </span>
                    <span>
                      {report.combinedAmount === null
                        ? copy.unavailable
                        : money(report.combinedAmount, report.currency)}
                    </span>
                  </span>
                  <span className="grid gap-0.5 tabular-nums text-muted-foreground">
                    <span className="text-[11px] lg:hidden">{copy.budget}</span>
                    <span>
                      {report.budgetAmount === null
                        ? copy.noBudget
                        : money(report.budgetAmount, report.currency)}
                    </span>
                  </span>
                  <span className="grid gap-1">
                    <span className="text-[11px] text-muted-foreground lg:hidden">
                      {copy.verdict}
                    </span>
                    {report.verdictStatus ? (
                      <StatusPill status={report.verdictStatus} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {copy.unavailable}
                      </span>
                    )}
                  </span>
                  <span className="grid gap-1">
                    <span className="text-[11px] text-muted-foreground lg:hidden">
                      {copy.caveats}
                    </span>
                    <StateBadge icon={RiInformationLine} tone="neutral">
                      {report.caveatCount === 0
                        ? copy.noCaveats
                        : copy.caveatCount(report.caveatCount)}
                    </StateBadge>
                  </span>
                  <RiArrowRightSLine className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 lg:block" />
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
