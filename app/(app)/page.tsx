import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Wallet03Icon } from "@hugeicons/core-free-icons";

import { EmptyState } from "@/components/domain/empty-state";
import { PageContainer } from "@/components/domain/page-container";
import { currentRole } from "@/lib/auth/session";
import { budgetedTeams } from "@/lib/engine/cockpit";
import { syncStamp } from "@/lib/format";
import { getHomeData } from "@/lib/home/queries";
import { Hero } from "./_components/hero";
import { MonthlyPaceChart } from "./_components/monthly-pace-chart";
import { ProviderComposition } from "./_components/provider-composition";
import { TeamBudgetTable } from "@/components/domain/team-budget-table";
import { ExecutiveDigestCard } from "./_components/executive-digest-card";
import { HomeGreeting } from "./_components/home-greeting";
import { WelcomeDialog } from "./_components/welcome-dialog";
import { homeCopy } from "./_components/copy";
import { canEditCompanySettings, profileLabel } from "@/lib/settings/account";
import { WELCOME_PARAM } from "@/lib/setup/steps";

// The Home cockpit (#19, redesigned 2026-07): a stable, read-mostly overview —
// a local-time greeting/status header over a three-card top row (hero,
// composition and executive digest), then monthly pace + the teams table.
// Nothing
// on this screen expands, opens drawers or edits; simulation and control plans
// live in /times/[id], budget editing in /ajustes/orcamentos. No arithmetic
// here; buildCockpit already did it (architecture §9).

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [
    { cockpit, period, user, orgWeekPct, unattributed, lastSyncAt, pace },
    params,
  ] = await Promise.all([getHomeData(), searchParams]);
  const name = profileLabel(user);
  const welcome = params[WELCOME_PARAM] === "1" && (
    <WelcomeDialog name={user.displayName?.trim() || null} hasBudget={cockpit.state !== "cold-start"} />
  );

  // Cold start (no org budget): the guided setup was skipped or a Viewer got
  // here first. Never an empty screen — say what is missing and who acts.
  if (cockpit.state === "cold-start") {
    const isAdmin = canEditCompanySettings((await currentRole()) ?? "viewer");
    return (
      <PageContainer variant="full" className="gap-6">
        <HomeGreeting name={name} status={null} />
        <EmptyState
          icon={<HugeiconsIcon icon={Wallet03Icon} />}
          title={homeCopy.noBudget.title}
          description={isAdmin ? homeCopy.noBudget.adminBody : homeCopy.noBudget.viewerBody}
          primaryAction={
            isAdmin ? <Link href="/configuracao">{homeCopy.noBudget.resume}</Link> : undefined
          }
          className="rounded-lg bg-card ring-1 ring-foreground/6"
        />
        {welcome}
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
      {/* The margin tops the row gap (gap-3) up to the shell's top inset
          (16px, 20px from md), so the greeting has equal air above and below. */}
      <div className="mb-1 flex flex-wrap items-start justify-between gap-x-6 gap-y-2 md:mb-2">
        <HomeGreeting name={name} status={cockpit.verdict.status} />
        {/* Freshness stamp (principle #3): same rule and format as Explore
            (oldest active sync + syncStamp) — one mechanism, two screens. The
            day-of-month meta left this corner (de-noise 2026-07-17): it now
            lives at the hero bar's "hoje" marker, its one canonical home. */}
        {lastSyncAt !== null && (
          <p className="mt-1 shrink-0 text-xs text-muted-foreground tabular-nums">
            {homeCopy.dataAsOf(syncStamp(lastSyncAt))}
          </p>
        )}
      </div>

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
      {welcome}
    </PageContainer>
  );
}
