import { PageContainer } from "@/components/domain/page-container";
import { budgetedTeams } from "@/lib/engine/cockpit";
import { syncStamp } from "@/lib/format";
import { getHomeData } from "@/lib/home/queries";
import { Hero } from "./_components/hero";
import { MonthlyPaceChart } from "./_components/monthly-pace-chart";
import { ProviderComposition } from "./_components/provider-composition";
import { TeamBudgetTable } from "@/components/domain/team-budget-table";
import { OnboardingGuide } from "./_components/onboarding-guide";
import { ExecutiveDigestCard } from "./_components/executive-digest-card";
import { HomeGreeting } from "./_components/home-greeting";
import { homeCopy } from "./_components/copy";
import { profileLabel } from "@/lib/settings/account";

// The Home cockpit (#19, redesigned 2026-07): a stable, read-mostly overview —
// a local-time greeting/status header over a three-card top row (hero,
// composition and executive digest), then monthly pace + the teams table.
// Nothing
// on this screen expands, opens drawers or edits; simulation and control plans
// live in /times/[id], budget editing in /ajustes/orcamentos. No arithmetic
// here; buildCockpit already did it (architecture §9).

export default async function HomePage() {
  const {
    cockpit,
    period,
    user,
    orgWeekPct,
    setup,
    unattributed,
    lastSyncAt,
    pace,
  } = await getHomeData();

  if (cockpit.state === "cold-start") {
    return (
      <PageContainer variant="full" className="gap-6">
        <HomeGreeting name={profileLabel(user)} status={null} />
        <OnboardingGuide state={setup} />
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
    <PageContainer variant="full" className="flex-1 gap-3 xl:min-h-0">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <HomeGreeting name={profileLabel(user)} status={cockpit.verdict.status} />
        {/* Freshness stamp (principle #3): same rule and format as Explore
            (oldest active sync + syncStamp) — one mechanism, two screens. The
            day-of-month meta left this corner (de-noise 2026-07-17): it now
            lives at the hero bar's "hoje" marker, its one canonical home. */}
        {lastSyncAt !== null && (
          <p className="mt-1 shrink-0 text-xs font-light text-muted-foreground tabular-nums">
            {homeCopy.dataAsOf(syncStamp(lastSyncAt))}
          </p>
        )}
      </div>

      {/* Setup guide (PRD story: first verdict): a verdict can exist while a
          step is still missing (e.g. budget set, roster pending) — keep the
          compact strip until all three are done. Renders null when complete. */}
      <OnboardingGuide state={setup} variant="compact" />

      {/* The cockpit grid. min-w-0 wrappers matter: grid children default to
          min-width auto, and the table + long tabular-nums strings would
          otherwise push the track past the viewport (horizontal overflow).
          min-h-0 on the cells lets row 2 shrink into the viewport instead of
          pushing the page into a scroll — the pace chart compacts and the
          teams table scrolls internally. Row 1 hugs its content (the dense
          hero sets the height) and row 2 takes every leftover pixel. */}
      <div className="home-cockpit grid items-stretch gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,24rem)_minmax(0,1.45fr)]">
        <div className="min-w-0 min-h-0 lg:col-span-2 xl:col-span-1">
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
        <div className="min-w-0 min-h-0">
          <ExecutiveDigestCard cockpit={cockpit} currency={currency} />
        </div>
        <div className="min-w-0 min-h-0">
          <ProviderComposition
            entries={cockpit.composition}
            currency={currency}
            unattributed={showUnattributed ? unattributed : null}
          />
        </div>
      </div>

      <div className="home-cockpit grid flex-1 items-stretch gap-3 lg:grid-cols-2 xl:min-h-0 xl:grid-rows-[minmax(0,1fr)]">
        <div className="min-w-0 min-h-0">
          {pace && (
            <MonthlyPaceChart
              pace={pace}
              currency={currency}
              monthLabel={period.monthLabel}
              forecastRange={cockpit.orgForecast?.probableRange ?? null}
              confidence={cockpit.orgForecast?.confidence ?? null}
              refStamp={lastSyncAt !== null ? syncStamp(lastSyncAt) : null}
            />
          )}
        </div>
        <div className="min-w-0 min-h-0">
          <TeamBudgetTable
            teams={allTeams}
            attentionCount={cockpit.needsAttention.length}
            currency={currency}
          />
        </div>
      </div>
    </PageContainer>
  );
}
