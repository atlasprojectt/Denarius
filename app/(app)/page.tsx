import Link from "next/link";
import { RiCheckLine, RiDashboard3Line } from "@remixicon/react";

import { StaleBanner } from "@/components/domain/stale-banner";
import { VerdictLine } from "@/components/domain/verdict-line";
import { PageContainer } from "@/components/domain/page-container";
import { Button } from "@/components/ui/button";
import { percent } from "@/lib/format";
import { getHomeData } from "@/lib/home/queries";
import { AllClear } from "./_components/all-clear";
import { Hero } from "./_components/hero";
import { HomeAnimationController } from "./_components/home-animation-controller";
import { MonthlyPaceChart } from "./_components/monthly-pace-chart";
import { ObservationsFooter } from "./_components/observations-footer";
import { ProviderComposition } from "./_components/provider-composition";
import { TeamBudgetTable } from "./_components/team-budget-table";
import { SetupChecklist } from "./_components/setup-checklist";
import { homeCopy } from "./_components/copy";

// The Home cockpit (#19, redesigned 2026-07): a stable, read-mostly overview in
// full-width rows — verdict (the answer), hero (the money headline), pace +
// composition (analysis), the teams table (drill-down entry), observations
// (ambient). Nothing on this screen expands, opens drawers or edits; simulation
// and control plans live in /explorar/time/[id], budget editing in
// /ajustes/orcamentos. No arithmetic here; buildCockpit already did it
// (architecture §9).

export default async function HomePage() {
  const { cockpit, period, stale, observations, hasSeatWaste, setup } = await getHomeData();

  if (cockpit.state === "cold-start") {
    return (
      <PageContainer variant="full" className="gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {homeCopy.question}
        </h1>
        <div className="rounded-xl border bg-card p-6 shadow-xs md:p-8">
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
                <RiCheckLine className="size-4 shrink-0 text-primary" aria-hidden />
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
  const allTeams = [...cockpit.needsAttention, ...cockpit.underControl];

  return (
    <PageContainer data-home-motion-root variant="full" className="gap-6">
      <HomeAnimationController />
      <h1 className="sr-only">{homeCopy.question}</h1>

      {stale.showBanner && <StaleBanner items={stale.needsAttention} />}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <VerdictLine verdict={cockpit.verdict} />
        <p className="mt-1 shrink-0 text-sm text-muted-foreground tabular-nums">
          {homeCopy.meta(
            period.dayOfPeriod,
            period.daysInPeriod,
            percent(org.pctElapsed),
          )}
        </p>
      </div>

      {cockpit.allClear && <AllClear />}

      <div className="grid items-stretch gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Hero
            org={org}
            status={cockpit.verdict.status}
            pctProjected={cockpit.orgPctProjected}
            unconvertedUsd={cockpit.orgUnconvertedUsd}
            currency={currency}
            dayOfPeriod={period.dayOfPeriod}
            daysInPeriod={period.daysInPeriod}
          />
        </div>
        <ProviderComposition entries={cockpit.composition} currency={currency} />
      </div>

      <MonthlyPaceChart org={org} currency={currency} />

      <TeamBudgetTable
        teams={allTeams}
        attentionCount={cockpit.needsAttention.length}
        currency={currency}
      />

      <ObservationsFooter
        items={observations.filter((item) => item.kind === "observation")}
        hasSeatWaste={hasSeatWaste}
      />
    </PageContainer>
  );
}
