import "server-only";

import { attributeSeats } from "@/lib/engine/accrual";
import type { PeriodProgress } from "@/lib/engine/accrual";
import { buildCockpit, type Cockpit } from "@/lib/engine/cockpit";
import { freshness, type ConnectionStatus } from "@/lib/engine/freshness";
import { currentPeriod, monthStartUtc } from "@/lib/engine/period";
import { combineTeamSpend } from "@/lib/engine/team-spend";
import { isoDaysAgo, weekOverWeek } from "@/lib/engine/week-change";
import {
  buildApontamentos,
  type Apontamento,
} from "@/lib/findings/apontamentos";
import { listBudgets } from "@/lib/budgets/queries";
import { listSubscriptions } from "@/lib/subscriptions/queries";
import { listTeams } from "@/lib/teams/queries";
import { createClient } from "@/lib/supabase/server";
import { mapKey, teamApiSpend } from "@/lib/usage/attribution";

// Read path for the Home cockpit (#19) + observations footer (#21). Gathers
// the raw spend parts under RLS and hands them to the pure engine
// (buildCockpit, buildApontamentos) — all arithmetic, ordering and verdict
// live there, not here and not in the page.

export type HomeData = {
  cockpit: Cockpit;
  period: PeriodProgress;
  /** Connection freshness for the stale-data banner (honesty in the chrome). */
  stale: ReturnType<typeof freshness>;
  /** Calm observations for the footer — in-app only, never emailed (P14). */
  apontamentos: Apontamento[];
};

type ConnectionRow = {
  provider: string;
  status: string;
  last_sync_at: string | null;
};

/** Month-to-date provider-reported cost (USD, the headline truth), by provider. */
async function providerCostToDate(): Promise<{ provider: string; usd: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cost_daily")
    .select("provider, amount")
    .gte("date", monthStartUtc());

  const byProvider = new Map<string, number>();
  for (const row of (data ?? []) as { provider: string; amount: number }[]) {
    byProvider.set(row.provider, (byProvider.get(row.provider) ?? 0) + row.amount);
  }
  return [...byProvider.entries()].map(([provider, usd]) => ({ provider, usd }));
}

type WeekUsageRow = {
  date: string;
  provider: string;
  project_id: string;
  derived_cost: number | null;
  uncosted: boolean;
};
type MapRow = { provider: string; project_id: string; team_id: string };

/** Per-team week-over-week API change (USD ratio — currency-free) for the
 *  acceleration apontamento. Unmapped usage has no team, so it's excluded. */
async function teamWeekChanges(
  teamName: Map<string, string>,
  now: Date,
): Promise<{ name: string; pct: number | null }[]> {
  const supabase = await createClient();
  const [{ data: usageData }, { data: mapData }] = await Promise.all([
    supabase
      .from("usage_daily")
      .select("date, provider, project_id, derived_cost, uncosted")
      .gte("date", isoDaysAgo(now, 14)),
    supabase.from("project_map").select("provider, project_id, team_id"),
  ]);

  const projectTeam = new Map(
    ((mapData ?? []) as MapRow[]).map((m) => [mapKey(m.provider, m.project_id), m.team_id]),
  );
  const rowsByTeam = new Map<string, { date: string; amount: number }[]>();
  for (const row of (usageData ?? []) as WeekUsageRow[]) {
    if (row.uncosted || row.derived_cost === null || row.project_id === "") continue;
    const teamId = projectTeam.get(mapKey(row.provider, row.project_id));
    if (teamId === undefined) continue;
    const rows = rowsByTeam.get(teamId) ?? [];
    rows.push({ date: row.date, amount: row.derived_cost });
    rowsByTeam.set(teamId, rows);
  }

  return [...rowsByTeam.entries()].map(([teamId, rows]) => ({
    name: teamName.get(teamId) ?? "—",
    pct: weekOverWeek(rows, now).pct,
  }));
}

export async function getHomeData(): Promise<HomeData> {
  const period = currentPeriod();
  const now = new Date();
  const supabase = await createClient();

  const [budgets, { subscriptions }, apiTeams, teams, providers, { data: connectionData }] =
    await Promise.all([
      listBudgets(),
      listSubscriptions(),
      teamApiSpend(),
      listTeams(),
      providerCostToDate(),
      supabase.from("provider_connection").select("provider, status, last_sync_at"),
    ]);

  const seats = attributeSeats(subscriptions, period);
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const seatByTeam = new Map(seats.teams.map((t) => [t.teamId, t.accrued]));
  const apiByTeam = new Map(apiTeams.teams.map((t) => [t.teamId, t.derivedUsd]));
  const reportedUsd = providers.reduce((sum, p) => sum + p.usd, 0);

  const org = budgets.org
    ? {
        budget: budgets.org.amount,
        seatDisplay: seats.orgTotal,
        apiUsd: reportedUsd,
        fxRate: budgets.org.frozenFxRate,
        thresholds: budgets.org.thresholds,
      }
    : null;

  const cockpitTeams = budgets.teams
    .filter((b) => b.teamId !== null)
    .map((b) => ({
      teamId: b.teamId as string,
      teamName: teamName.get(b.teamId as string) ?? "—",
      budget: b.amount,
      seatDisplay: seatByTeam.get(b.teamId as string) ?? 0,
      apiUsd: apiByTeam.get(b.teamId as string) ?? 0,
      fxRate: b.frozenFxRate,
      thresholds: b.thresholds,
    }));

  const cockpit = buildCockpit({
    period,
    currency: budgets.currency,
    periodEndLabel: `${period.daysInPeriod} de ${period.monthLabel}`,
    org,
    teams: cockpitTeams,
    composition: providers,
  });

  const connections = ((connectionData ?? []) as ConnectionRow[]).map(
    (c): ConnectionStatus => ({
      provider: c.provider as ConnectionStatus["provider"],
      status: c.status,
      lastSyncAt: c.last_sync_at,
    }),
  );

  // Observations footer (#21): pure rules over the same aggregates. A warned
  // team never re-appears as an apontamento — one event, one channel.
  const weekByTeam = await teamWeekChanges(teamName, now);
  const budgetedTeams =
    cockpit.state === "ready"
      ? [
          ...cockpit.needsAttention.map((t) => ({
            name: t.teamName,
            pctSpent: t.evaluation.pctSpent,
            hasWarning: true,
          })),
          ...cockpit.underControl.map((t) => ({
            name: t.teamName,
            pctSpent: t.evaluation.pctSpent,
            hasWarning: false,
          })),
        ]
      : [];
  const apontamentos = buildApontamentos({
    currency: budgets.currency,
    budgetedTeams,
    weekByTeam,
    spendMix: combineTeamSpend({
      teams,
      seatByTeam,
      apiUsdByTeam: apiByTeam,
      seatUnattributed: seats.unattributed,
      apiUnattributedUsd: apiTeams.unattributedUsd,
      fxRate: budgets.org?.frozenFxRate ?? null,
    }),
  });

  return { cockpit, period, stale: freshness(connections), apontamentos };
}
