import Link from "next/link";
import { IconCheck, IconGauge } from "@tabler/icons-react";

import { StaleBanner } from "@/components/domain/stale-banner";
import { VerdictLine } from "@/components/domain/verdict-line";
import { Button } from "@/components/ui/button";
import { getHomeData } from "@/lib/home/queries";
import { AllClear } from "./_components/all-clear";
import { Hero } from "./_components/hero";
import { MonthlyPaceChart } from "./_components/monthly-pace-chart";
import { ObservationsFooter } from "./_components/observations-footer";
import { ProviderComposition } from "./_components/provider-composition";
import { TeamRow, type TeamRowData } from "./_components/team-row";
import { UnderControl, type UnderControlTeam } from "./_components/under-control";
import { homeCopy } from "./_components/copy";

// The Home cockpit (#19). Server Component: reads the engine-assembled cockpit
// and renders it. Verdict-first — the one-line answer on top, then the hero, the
// teams that need attention, the calm ones collapsed, and where the money goes.
// No arithmetic here; buildCockpit already did it (architecture §9).

export default async function HomePage() {
  const { cockpit, period, stale, observations, hasSeatWaste } = await getHomeData();

  if (cockpit.state === "cold-start") {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {homeCopy.question}
        </h1>
        <div className="rounded-xl border bg-card p-8 shadow-xs">
          <IconGauge className="size-8 text-muted-foreground" aria-hidden />
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
                <IconCheck className="size-4 shrink-0 text-primary" aria-hidden />
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
      </div>
    );
  }

  const { org, currency } = cockpit;

  const needsAttentionRows: TeamRowData[] = cockpit.needsAttention.map((t) => ({
    teamId: t.teamId,
    teamName: t.teamName,
    status: t.status,
    level: t.finding!.level,
    pctSpent: t.evaluation.pctSpent,
    pctProjected: t.pctProjected,
    budget: t.evaluation.budget,
    spent: t.evaluation.spent,
    projection: t.evaluation.projection,
    warnPct: t.warnPct,
    controlPlan: t.finding!.controlPlan,
    currency,
    orgProjection: org.projection,
    orgBudget: org.budget,
  }));

  const underControlTeams: UnderControlTeam[] = cockpit.underControl.map((t) => ({
    teamId: t.teamId,
    teamName: t.teamName,
    pctSpent: t.evaluation.pctSpent,
    pctProjected: t.pctProjected,
    spent: t.evaluation.spent,
    budget: t.evaluation.budget,
  }));

  return (
    <div className="flex w-full flex-col gap-5">
      <h1 className="sr-only">{homeCopy.question}</h1>

      {stale.showBanner && <StaleBanner items={stale.needsAttention} />}

      <VerdictLine verdict={cockpit.verdict} />

      <div className="grid w-full items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
        <section className="flex min-w-0 flex-col gap-5">
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
            <Hero
              org={org}
              status={cockpit.verdict.status}
              orgWarnPct={cockpit.orgWarnPct}
              unconvertedUsd={cockpit.orgUnconvertedUsd}
              pctProjected={cockpit.orgPctProjected}
              currency={currency}
              dayOfPeriod={period.dayOfPeriod}
              daysInPeriod={period.daysInPeriod}
            />
            <MonthlyPaceChart org={org} currency={currency} />
          </div>

          {!cockpit.allClear && needsAttentionRows.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold tracking-tight">
                {homeCopy.needsAttention.title(needsAttentionRows.length)}
              </h2>
              <ul className="grid gap-3 2xl:grid-cols-2">
                {needsAttentionRows.map((row) => (
                  <TeamRow key={row.teamId} row={row} />
                ))}
              </ul>
            </section>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-[76px]">
          {cockpit.allClear && <AllClear />}

          <ProviderComposition entries={cockpit.composition} currency={currency} />

          <ObservationsFooter items={observations} hasSeatWaste={hasSeatWaste} />

          <UnderControl teams={underControlTeams} currency={currency} />
        </aside>
      </div>
    </div>
  );
}
