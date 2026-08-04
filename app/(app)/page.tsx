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
import { AiInsights } from "./_components/ai-insights";
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
    <PageContainer variant="full" className="gap-4">
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

      {/* THE ANSWER (2026-08-02 relayout). Nothing here is stretched to fill the
          viewport any more — that rule (proportion pass, 2026-07-14) worked while
          every card was dense, and produced large voids the moment short content
          arrived: a 3-sentence card and a 5-row table were being inflated to the
          height of the hero and of the leftover screen.

          The rule now: ONLY CARDS THAT CAN BREATHE ABSORB SLACK. The right column
          is a STACK, so the insights card keeps its natural height and
          ProviderComposition — which already distributes its bars over whatever
          height it is given — takes the remainder. When the stack is the taller
          side, Hero absorbs instead (its CardContent is justify-between).

          min-w-0 stays load-bearing: grid children default to min-width auto, and
          long tabular-nums strings would push the track past the viewport. */}
      <section className="grid items-stretch gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
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
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-5">
          <AiInsights
            items={observations.filter((item) => item.kind === "observation")}
          />
          {/* flex-1: the one card in the stack designed to spread. */}
          <div className="flex min-h-0 flex-1 flex-col">
            <ProviderComposition
              entries={cockpit.composition}
              currency={currency}
              unattributed={showUnattributed ? unattributed : null}
            />
          </div>
        </div>
      </section>

      {/* THE EVIDENCE — full width, each at its own natural height. The chart
          reads better across 31 daily points than squeezed into half a row, and
          the table recovers the columns the container query dropped when narrow. */}
      {pace && (
        <MonthlyPaceChart
          pace={pace}
          currency={currency}
          monthLabel={period.monthLabel}
        />
      )}

      <TeamBudgetTable
        teams={allTeams}
        attentionCount={cockpit.needsAttention.length}
        currency={currency}
        variant="table"
      />
    </PageContainer>
  );
}
