import Link from "next/link";
import { RiCheckLine, RiDashboard3Line } from "@remixicon/react";

import { VerdictLine } from "@/components/domain/verdict-line";
import { PageContainer } from "@/components/domain/page-container";
import { Button } from "@/components/ui/button";
import { budgetedTeams } from "@/lib/engine/cockpit";
import { syncStamp } from "@/lib/format";
import { getHomeData } from "@/lib/home/queries";
import { Hero } from "./_components/hero";
import { MonthlyPaceChart } from "./_components/monthly-pace-chart";
import { ObservationsFooter } from "./_components/observations-footer";
import { ProviderComposition } from "./_components/provider-composition";
import { TeamBudgetTable } from "@/components/domain/team-budget-table";
import { SetupChecklist } from "./_components/setup-checklist";
import { homeCopy } from "./_components/copy";

// The Home cockpit (#19, redesigned 2026-07): a stable, read-mostly overview —
// the verdict line (the answer) over a 2x2 card grid: hero (the money
// headline) + composition (where it goes) on top, monthly pace + the teams
// table (drill-down entry) below, observations as the ambient footer. Nothing
// on this screen expands, opens drawers or edits; simulation and control plans
// live in /times/[id], budget editing in /ajustes/orcamentos. No arithmetic
// here; buildCockpit already did it (architecture §9).

export default async function HomePage() {
  const {
    cockpit,
    period,
    observations,
    hasSeatWaste,
    orgWeekPct,
    setup,
    unattributed,
    lastSyncAt,
    pace,
  } = await getHomeData();

  if (cockpit.state === "cold-start") {
    return (
      <PageContainer variant="full" className="gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {homeCopy.question}
        </h1>
        <div className="rounded-xl border p-6 md:p-8">
          <RiDashboard3Line className="size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            {homeCopy.coldStart.title}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm/relaxed text-muted-foreground">
            {homeCopy.coldStart.body}
          </p>
          <ul className="mt-5 flex flex-col gap-2">
            {homeCopy.coldStart.unlocks.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-sm text-muted-foreground"
              >
                <RiCheckLine className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Button asChild>
              <Link href="/ajustes/orcamentos">
                {homeCopy.coldStart.setBudgetCta}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ajustes/conexoes">
                {homeCopy.coldStart.connectCta}
              </Link>
            </Button>
          </div>
        </div>
        <SetupChecklist state={setup} />
      </PageContainer>
    );
  }

  const { org, currency } = cockpit;
  const allTeams = budgetedTeams(cockpit);

  // Cents-rounded: a sub-cent leftover must not resurrect the disclosure line
  // as "R$ 0,00"; the unconverted-USD part keeps it honest when FX is missing.
  const showUnattributed =
    Math.round(unattributed.display * 100) > 0 || unattributed.unconvertedUsd > 0;

  return (
    <PageContainer variant="full" className="flex-1 gap-4">
      <h1 className="sr-only">{homeCopy.question}</h1>

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <VerdictLine
          verdict={cockpit.verdict}
          action={
            cockpit.verdict.teamId !== null
              ? {
                  label: homeCopy.verdictAction,
                  href: `/times/${cockpit.verdict.teamId}`,
                }
              : null
          }
        />
        {/* Freshness stamp (principle #3): same rule and format as Explore
            (oldest active sync + syncStamp) — one mechanism, two screens. The
            day-of-month meta left this corner (de-noise 2026-07-17): it now
            lives at the hero bar's "hoje" marker, its one canonical home. */}
        {lastSyncAt !== null && (
          <p className="mt-1 shrink-0 text-xs text-muted-foreground/70 tabular-nums">
            {homeCopy.dataAsOf(syncStamp(lastSyncAt))}
          </p>
        )}
      </div>

      {/* Setup guide (PRD story: first verdict): a verdict can exist while a
          step is still missing (e.g. budget set, roster pending) — keep the
          compact strip until all three are done. Renders null when complete. */}
      <SetupChecklist state={setup} variant="compact" />

      {/* The 2x2 grid. min-w-0 wrappers matter: grid children default to
          min-width auto, and the table + long tabular-nums strings would
          otherwise push the track past the viewport (horizontal overflow).
          Row 1 hugs its content (the dense hero sets the height) and row 2
          takes every leftover pixel — the pace chart grows with it, so the
          viewport is filled by the chart, not by voids inside the top cards
          (proportion pass, 2026-07-14). */}
      <div className="grid flex-1 items-stretch gap-4 xl:grid-cols-2 xl:grid-rows-[auto_minmax(0,1fr)]">
        <div className="min-w-0">
          <Hero
            org={org}
            pctProjected={cockpit.orgPctProjected}
            unconvertedUsd={cockpit.orgUnconvertedUsd}
            currency={currency}
            dayOfPeriod={period.dayOfPeriod}
            daysInPeriod={period.daysInPeriod}
            weekPct={orgWeekPct}
          />
        </div>
        <div className="min-w-0">
          <ProviderComposition
            entries={cockpit.composition}
            currency={currency}
            unattributed={showUnattributed ? unattributed : null}
          />
        </div>
        <div className="min-w-0">
          {pace && (
            <MonthlyPaceChart
              pace={pace}
              currency={currency}
              monthLabel={period.monthLabel}
            />
          )}
        </div>
        <div className="min-w-0">
          <TeamBudgetTable
            teams={allTeams}
            attentionCount={cockpit.needsAttention.length}
            currency={currency}
            variant="table"
          />
        </div>
      </div>

      <ObservationsFooter
        items={observations.filter((item) => item.kind === "observation")}
        hasSeatWaste={hasSeatWaste}
      />
    </PageContainer>
  );
}
