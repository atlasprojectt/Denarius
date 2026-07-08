import Link from "next/link";
import { CheckIcon, GaugeIcon } from "@phosphor-icons/react/dist/ssr";

import { StaleBanner } from "@/components/domain/stale-banner";
import { VerdictLine } from "@/components/domain/verdict-line";
import { Button } from "@/components/ui/button";
import { getHomeData } from "@/lib/home/queries";
import { AllClear } from "./_components/all-clear";
import { Hero } from "./_components/hero";
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
          <GaugeIcon className="size-8 text-muted-foreground" aria-hidden />
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
                <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden />
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <h1 className="sr-only">{homeCopy.question}</h1>

      {stale.showBanner && <StaleBanner items={stale.needsAttention} />}

      <VerdictLine verdict={cockpit.verdict} />

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

      {cockpit.allClear ? (
        <AllClear />
      ) : (
        needsAttentionRows.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-tight">
              {homeCopy.needsAttention.title(needsAttentionRows.length)}
            </h2>
            <ul className="flex flex-col gap-3">
              {needsAttentionRows.map((row) => (
                <TeamRow key={row.teamId} row={row} />
              ))}
            </ul>
          </section>
        )
      )}

      <UnderControl teams={underControlTeams} currency={currency} />

      <ObservationsFooter items={observations} hasSeatWaste={hasSeatWaste} />

      <ProviderComposition entries={cockpit.composition} currency={currency} />
    </div>
  );
}
