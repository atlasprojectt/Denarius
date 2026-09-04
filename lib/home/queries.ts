import "server-only";

import { cache } from "react";

import { attributeSeats } from "@/lib/engine/accrual";
import type { SeatSubscription } from "@/lib/engine/accrual";
import { combinedSpend, governedDailySpend } from "@/lib/engine/budget";
import { buildCockpit, type Cockpit } from "@/lib/engine/cockpit";
import { buildMonthlyPace, type MonthlyPace } from "@/lib/engine/monthly-pace";
import { oldestActiveSync, type ConnectionStatus } from "@/lib/engine/freshness";
import { periodFx, type FrozenFx } from "@/lib/engine/money-model";
import { currentPeriod, monthStartUtc, type Period } from "@/lib/engine/period";
import { combineTeamSpend } from "@/lib/engine/team-spend";
import { isoDaysAgo, weekOverWeek } from "@/lib/engine/week-change";
import {
  buildBudgetNotifications,
  type BudgetNotification,
} from "@/lib/home/notifications";
import { listBudgets, type BudgetList } from "@/lib/budgets/queries";
import { listSubscriptions } from "@/lib/subscriptions/queries";
import { listTeams } from "@/lib/teams/queries";
import { createClient } from "@/lib/supabase/server";
import { teamApiSpend } from "@/lib/usage/attribution";

// Read path for the Home cockpit (#19). Gathers the raw spend parts under RLS
// and hands them to the pure engine — all arithmetic, ordering and verdict live
// there, not here and not in the page.

export type CockpitData = {
  cockpit: Cockpit;
  period: Period;
  /** THE period's frozen USD→display rate (money-model contract) — one rate
   *  for every conversion on every screen; null disclosed, never guessed. */
  fx: FrozenFx | null;
};

export type HomeData = CockpitData & {
  /** Org week-over-week API cost change (reported USD — same source and math
   *  as the digest, so screen and email can never disagree). Neutral display
   *  only (principle #5); null when the previous week has no spend. */
  orgWeekPct: number | null;
  setup: { connected: boolean; hasRoster: boolean; hasBudget: boolean };
  /** Spend not yet attributed to any team (shared seats + unmapped API),
   *  combined at the frozen FX for the composition disclosure line —
   *  invariant #3: the amount inside the source slices that the team cut
   *  can't place. `unconvertedUsd` carries the API part when FX is missing
   *  (disclosed, never summed). */
  unattributed: { display: number; unconvertedUsd: number };
  /** Freshness stamp (oldest active sync, same rule/format as Explore). */
  lastSyncAt: string | null;
  /** The "Evolução do mês" per-day series (cumulative + daily bars +
   *  projection). null before an org budget exists (cold-start renders no
   *  chart). Built here from the daily cost read, never in the component. */
  pace: MonthlyPace | null;
};

type ConnectionRow = {
  provider: string;
  status: string;
  last_sync_at: string | null;
};

/** cost_daily rows for the last 14 days — the org week-over-week input, same
 *  source as the digest snapshot (lib/notify/snapshot.ts). */
async function orgWeekCosts(now: Date): Promise<{ date: string; amount: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cost_daily")
    .select("date, amount")
    .gte("date", isoDaysAgo(now, 14));
  return (data ?? []) as { date: string; amount: number }[];
}

/** Month-to-date provider-reported cost (USD, the headline truth), summed per
 *  calendar day — the daily grain the pace chart's cumulative + bars need. Same
 *  source as `providerCostToDate` (their totals reconcile), one row per day. */
async function orgDailyCosts(): Promise<{ date: string; usd: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cost_daily")
    .select("date, amount")
    .gte("date", monthStartUtc());

  const byDate = new Map<string, number>();
  for (const row of (data ?? []) as { date: string; amount: number }[]) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.amount);
  }
  return [...byDate.entries()].map(([date, usd]) => ({ date, usd }));
}

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

/** Roster headcount per team — the honest denominator for the seats-vs-roster
 *  check. `employee.team_id` is NOT NULL, so the whole-roster total is exactly
 *  Σ byTeam (derived at the call site — one source of truth). */
async function rosterHeadcount(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("employee").select("team_id");
  const byTeam = new Map<string, number>();
  for (const row of (data ?? []) as { team_id: string }[]) {
    byTeam.set(row.team_id, (byTeam.get(row.team_id) ?? 0) + 1);
  }
  return byTeam;
}

/** The cockpit plus raw parts shared by Home, Times and reports. */
type CockpitAssembly = CockpitData & {
  currency: string;
  teams: { id: string; name: string }[];
  teamName: Map<string, string>;
  subscriptions: SeatSubscription[];
  seatByTeam: Map<string, number>;
  apiByTeam: Map<string, number>;
  /** Seat cost accrued through today across the whole org (Σ teams +
   *  unattributed) — the pace chart's seat baseline. */
  orgSeatTotal: number;
  seatUnattributed: number;
  apiUnattributedUsd: number;
  /** Provider-REPORTED month-to-date cost (USD) per provider — the headline
   *  truth behind the composition list. */
  providers: { provider: string; usd: number }[];
  /** Σ DERIVED cost, costed models only (USD) — the reconciliation input. */
  derivedUsd: number;
  /** At least one usage bucket carried a model with no price. */
  hasUncosted: boolean;
  /** Raw connection states, for consumers that need the freshness rule itself
   *  rather than just the stamp. */
  connections: ConnectionStatus[];
  /** The period's budget rows as read — carried so consumers never re-query
   *  them (this assembly is the one memoized read). */
  budgets: BudgetList;
  connected: boolean;
  hasOrgBudget: boolean;
  /** Oldest successful sync among active connections — THE freshness stamp
   *  (same rule as Explore via oldestActiveSync); null when nothing synced. */
  lastSyncAt: string | null;
};

/** Per-request memoized: the app layout reads the cockpit for the sidebar
 *  all-clear notice, and Home/Times read it again for their own screens — one
 *  render pass, one assembly, so the extra chrome costs no extra queries. */
const assembleCockpit = cache(async function assembleCockpit(): Promise<CockpitAssembly> {
  const period = currentPeriod();
  const supabase = await createClient();

  const [budgets, { subscriptions }, apiTeams, teams, providers, { data: connectionData }, dailyCosts] =
    await Promise.all([
      listBudgets(),
      listSubscriptions(),
      teamApiSpend(),
      listTeams(),
      providerCostToDate(),
      supabase.from("provider_connection").select("provider, status, last_sync_at"),
      orgDailyCosts(),
    ]);

  const seats = attributeSeats(subscriptions, period);
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const seatByTeam = new Map(seats.teams.map((t) => [t.teamId, t.accrued]));
  const apiByTeam = new Map(apiTeams.teams.map((t) => [t.teamId, t.derivedUsd]));
  const reportedUsd = providers.reduce((sum, p) => sum + p.usd, 0);

  // ONE frozen FX for every scope this period (money-model contract) — the
  // per-budget triples are the audit trail, not per-screen conversion inputs.
  const fx = periodFx(budgets);
  const fxRate = fx?.rate ?? null;

  const org = budgets.org
    ? {
        budget: budgets.org.amount,
        seatDisplay: seats.orgTotal,
        apiUsd: reportedUsd,
        fxRate,
        thresholds: budgets.org.thresholds,
        // Behavior-aware close input (Forecast v2): per-day governed spend in
        // display currency from the already-read daily costs. Undefined (missing
        // FX, nothing elapsed) keeps the linear run-rate — never a guess.
        dailySpend: governedDailySpend({
          apiByDay: dailyCosts,
          fxRate,
          seatAccrued: seats.orgTotal,
          monthStart: period.monthStart,
          dayOfPeriod: period.dayOfPeriod,
        }),
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
      fxRate,
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

  return {
    cockpit,
    period,
    fx,
    currency: budgets.currency,
    teams,
    teamName,
    subscriptions,
    seatByTeam,
    apiByTeam,
    orgSeatTotal: seats.orgTotal,
    seatUnattributed: seats.unattributed,
    apiUnattributedUsd: apiTeams.unattributedUsd,
    providers,
    derivedUsd: apiTeams.orgTotalUsd,
    hasUncosted: apiTeams.hasUncosted,
    connections,
    budgets,
    connected: connections.some((connection) => connection.status === "active"),
    hasOrgBudget: budgets.org !== null,
    lastSyncAt: oldestActiveSync(connections),
  };
});

/** The cockpit alone — for consumers such as the app layout's sidebar notices. */
export async function getCockpitData(): Promise<CockpitData> {
  const { cockpit, period, fx } = await assembleCockpit();
  return { cockpit, period, fx };
}

/** Everything the on-demand report needs to describe the running month, from
 *  the SAME memoized assembly Home reads — so the report can never disagree
 *  with the cockpit the user just looked at. Adds no query of its own. */
export type ReportParts = Pick<
  CockpitAssembly,
  | "period"
  | "fx"
  | "currency"
  | "teams"
  | "subscriptions"
  | "apiByTeam"
  | "apiUnattributedUsd"
  | "providers"
  | "derivedUsd"
  | "hasUncosted"
  | "connections"
> & {
  orgBudget: { amount: number; thresholds: number[] } | null;
  teamBudgets: { teamId: string; amount: number; thresholds: number[] }[];
};

export async function getReportParts(): Promise<ReportParts> {
  const a = await assembleCockpit();
  return {
    period: a.period,
    fx: a.fx,
    currency: a.currency,
    teams: a.teams,
    subscriptions: a.subscriptions,
    apiByTeam: a.apiByTeam,
    apiUnattributedUsd: a.apiUnattributedUsd,
    providers: a.providers,
    derivedUsd: a.derivedUsd,
    hasUncosted: a.hasUncosted,
    connections: a.connections,
    orgBudget: a.budgets.org
      ? { amount: a.budgets.org.amount, thresholds: a.budgets.org.thresholds }
      : null,
    teamBudgets: a.budgets.teams
      .filter((b) => b.teamId !== null)
      .map((b) => ({
        teamId: b.teamId as string,
        amount: b.amount,
        thresholds: b.thresholds,
      })),
  };
}

export type TimesData = CockpitData & {
  currency: string;
  /** Every people team (the canonical list — includes non-budgeted teams). */
  teams: { id: string; name: string }[];
  /** Combined spend (seats + API × frozen FX) per team id, via the shared
   *  engine combine — null when the FX rate is missing (invariant #4). */
  combinedByTeam: Map<string, number> | null;
  combinedUnattributed: number | null;
  /** Raw parts for the FX-missing fallback: seats are display-currency native
   *  (honest alone), API stays USD and is disclosed, never summed. */
  seatByTeam: Map<string, number>;
  apiUsdByTeam: Map<string, number>;
  seatUnattributed: number;
  apiUnattributedUsd: number;
};

/** The Times tab read: one assembly pass (no re-fetch of teams/seats/usage on
 *  top of the cockpit's own reads) + the per-team combined spend from the
 *  shared engine combine, so Times can never drift from Home/email numbers. */
export async function getTimesData(): Promise<TimesData> {
  const a = await assembleCockpit();

  const mix = combineTeamSpend({
    teams: a.teams,
    seatByTeam: a.seatByTeam,
    apiUsdByTeam: a.apiByTeam,
    seatUnattributed: a.seatUnattributed,
    apiUnattributedUsd: a.apiUnattributedUsd,
    fxRate: a.fx?.rate ?? null,
  });
  // combineTeamSpend maps input.teams 1:1 in order — zip back to ids here so
  // pages never rely on that positional contract themselves.
  const combinedByTeam =
    mix === null ? null : new Map(a.teams.map((t, i) => [t.id, mix.teamDrivers[i].value]));

  return {
    cockpit: a.cockpit,
    period: a.period,
    fx: a.fx,
    currency: a.currency,
    teams: a.teams,
    combinedByTeam,
    combinedUnattributed: mix === null ? null : mix.unattributed,
    seatByTeam: a.seatByTeam,
    apiUsdByTeam: a.apiByTeam,
    seatUnattributed: a.seatUnattributed,
    apiUnattributedUsd: a.apiUnattributedUsd,
  };
}

export async function getHomeData(): Promise<HomeData> {
  const now = new Date();
  // The supplementary Home reads do not depend on the cockpit — one parallel
  // batch. Roster remains the setup-checklist source of truth.
  const [assembly, roster, weekCosts, dailyCosts] = await Promise.all([
    assembleCockpit(),
    rosterHeadcount(),
    orgWeekCosts(now),
    orgDailyCosts(),
  ]);

  const rosterTotal = [...roster.values()].reduce((sum, n) => sum + n, 0);

  // The pace series only exists once there is an org budget to evaluate against
  // (cockpit.org). Built from the frozen-FX combine, so its today point lands on
  // the same spent-to-date the Hero shows.
  const org = assembly.cockpit.state === "cold-start" ? null : assembly.cockpit.org;
  const pace = org
    ? buildMonthlyPace({
        apiByDay: dailyCosts,
        fxRate: assembly.fx?.rate ?? null,
        seatAccrued: assembly.orgSeatTotal,
        budget: org.budget,
        projection: org.projection,
        dayOfPeriod: assembly.period.dayOfPeriod,
        daysInPeriod: assembly.period.daysInPeriod,
      })
    : null;

  return {
    cockpit: assembly.cockpit,
    period: assembly.period,
    fx: assembly.fx,
    orgWeekPct: weekOverWeek(weekCosts, now).pct,
    setup: {
      connected: assembly.connected,
      hasRoster: rosterTotal > 0,
      hasBudget: assembly.hasOrgBudget,
    },
    unattributed: combinedSpend({
      seatDisplay: assembly.seatUnattributed,
      apiUsd: assembly.apiUnattributedUsd,
      fxRate: assembly.fx?.rate ?? null,
    }),
    lastSyncAt: assembly.lastSyncAt,
    pace,
  };
}

/**
 * Active budget alerts for the global notification center. Runs under RLS and
 * reuses the cockpit engine, so the header cannot disagree with the Home.
 */
export async function getBudgetNotifications(): Promise<BudgetNotification[]> {
  const { cockpit } = await assembleCockpit();
  return buildBudgetNotifications(cockpit);
}
