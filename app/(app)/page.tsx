import Link from "next/link";

import { StaleBanner } from "@/components/domain/stale-banner";
import { VerdictLine } from "@/components/domain/verdict-line";
import { Button } from "@/components/ui/button";
import { getHomeData } from "@/lib/home/queries";
import { AllClear } from "./_components/all-clear";
import { Hero } from "./_components/hero";
import { ProviderComposition } from "./_components/provider-composition";
import { TeamRow, type TeamRowData } from "./_components/team-row";
import { UnderControl, type UnderControlTeam } from "./_components/under-control";
import { homeCopy } from "./_components/copy";

// The Home cockpit (#19). Server Component: reads the engine-assembled cockpit
// and renders it. Verdict-first — the one-line answer on top, then the hero, the
// teams that need attention, the calm ones collapsed, and where the money goes.
// No arithmetic here; buildCockpit already did it (architecture §9).

export default async function HomePage() {
  const { cockpit, period, stale } = await getHomeData();

  if (cockpit.state === "cold-start") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">{homeCopy.question}</h1>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{homeCopy.coldStart.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{homeCopy.coldStart.body}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/ajustes/orcamentos">{homeCopy.coldStart.setBudgetCta}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ajustes/conexoes">{homeCopy.coldStart.connectCta}</Link>
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
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
            <h2 className="font-semibold">
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

      <ProviderComposition entries={cockpit.composition} currency={currency} />
    </div>
  );
}
