import "server-only";

import { attributeSeats } from "@/lib/engine/accrual";
import type { SeatSubscription } from "@/lib/engine/accrual";
import { budgetedTeams, buildCockpit, type Cockpit } from "@/lib/engine/cockpit";
import { freshness, type ConnectionStatus } from "@/lib/engine/freshness";
import { periodFx, type FrozenFx } from "@/lib/engine/money-model";
import { currentPeriod, monthStartUtc, type Period } from "@/lib/engine/period";
import { combineTeamSpend } from "@/lib/engine/team-spend";
import { isoDaysAgo, weekOverWeek } from "@/lib/engine/week-change";
import { buildApontamentos } from "@/lib/findings/apontamentos";
import { buildSeatWaste } from "@/lib/findings/seats-vs-roster";
import { listBudgets } from "@/lib/budgets/queries";
import { listSubscriptions } from "@/lib/subscriptions/queries";
import { listTeams } from "@/lib/teams/queries";
import { createClient } from "@/lib/supabase/server";
import { mapKey, teamApiSpend } from "@/lib/usage/attribution";

// Read path for the Home cockpit (#19) + observations footer (#21). Gathers
// the raw spend parts under RLS and hands them to the pure engine
// (buildCockpit, buildApontamentos) — all arithmetic, ordering and verdict
// live there, not here and not in the page.

export type CockpitData = {
  cockpit: Cockpit;
  period: Period;
  /** Connection freshness for the stale-data banner (honesty in the chrome). */
  stale: ReturnType<typeof freshness>;
  /** THE period's frozen USD→display rate (money-model contract) — one rate
   *  for every conversion on every screen; null disclosed, never guessed. */
  fx: FrozenFx | null;
};

/** One calm footer line — the ordering rule (apontamentos, then secondary
 *  waste) is applied here in the data layer, not in the component. */
export type Observation = {
  id: string;
  text: string;
  kind: "observation" | "action";
  href?: string;
  actionLabel?: string;
};

export type HomeData = CockpitData & {
  /** The calm "Observações" feed — in-app only, never emailed (P14). Ordered:
   *  apontamentos first, then the secondary seats-vs-roster waste (#22). */
  observations: Observation[];
  /** Whether the seats-vs-roster caveat note should show (any waste line). */
  hasSeatWaste: boolean;
  /** Org week-over-week API cost change (reported USD — same source and math
   *  as the digest, so screen and email can never disagree). Neutral display
   *  only (principle #5); null when the previous week has no spend. */
  orgWeekPct: number | null;
  setup: { connected: boolean; hasRoster: boolean; hasBudget: boolean };
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
  now: Date,
): Promise<{ teamId: string; pct: number | null }[]> {
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
    teamId,
    pct: weekOverWeek(rows, now).pct,
  }));
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

/** The cockpit plus the raw parts only the footer assemblies need. */
type CockpitAssembly = CockpitData & {
  currency: string;
  teams: { id: string; name: string }[];
  teamName: Map<string, string>;
  subscriptions: SeatSubscription[];
  seatByTeam: Map<string, number>;
  apiByTeam: Map<string, number>;
  seatUnattributed: number;
  apiUnattributedUsd: number;
  connected: boolean;
  hasOrgBudget: boolean;
};

async function assembleCockpit(): Promise<CockpitAssembly> {
  const period = currentPeriod();
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
    stale: freshness(connections),
    fx,
    currency: budgets.currency,
    teams,
    teamName,
    subscriptions,
    seatByTeam,
    apiByTeam,
    seatUnattributed: seats.unattributed,
    apiUnattributedUsd: apiTeams.unattributedUsd,
    connected: connections.some((connection) => connection.status === "active"),
    hasOrgBudget: budgets.org !== null,
  };
}

/** The cockpit alone — for screens (Explore team detail) that pre-load the
 *  simulator but render no observations, so the week-change queries and the
 *  apontamento rules never run for them. */
export async function getCockpitData(): Promise<CockpitData> {
  const { cockpit, period, stale, fx } = await assembleCockpit();
  return { cockpit, period, stale, fx };
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
    stale: a.stale,
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

/**
 * The calm feed (#21/#22): apontamentos then secondary seat-waste, mapped into
 * one ordered Observation[] split by kind. Pure over already-fetched aggregates
 * — the single source of truth for both the Home footer (kind "observation")
 * and the header's Próximas ações button (kind "action").
 */
function buildObservations(
  assembly: CockpitAssembly,
  weekRows: { teamId: string; pct: number | null }[],
  roster: Map<string, number>,
): Observation[] {
  const { cockpit } = assembly;
  // A warned team never re-appears as an apontamento — one event, one channel;
  // the warning flag comes from the finding itself, the cockpit's truth.
  const apontamentos = buildApontamentos({
    currency: assembly.currency,
    budgetedTeams: budgetedTeams(cockpit).map((t) => ({
      name: t.teamName,
      pctSpent: t.evaluation.pctSpent,
      hasWarning: t.finding !== null,
    })),
    weekByTeam: weekRows.map((w) => ({
      name: assembly.teamName.get(w.teamId) ?? "—",
      pct: w.pct,
    })),
    spendMix: combineTeamSpend({
      teams: assembly.teams,
      seatByTeam: assembly.seatByTeam,
      apiUsdByTeam: assembly.apiByTeam,
      seatUnattributed: assembly.seatUnattributed,
      apiUnattributedUsd: assembly.apiUnattributedUsd,
      fxRate: assembly.fx?.rate ?? null,
    }),
  });

  // Secondary waste (#22): seats paid vs roster people. Ordered AFTER the
  // apontamentos into one feed — waste is secondary by design. Ids are
  // namespaced so React keys can't collide.
  const seatWaste = buildSeatWaste({
    currency: assembly.currency,
    subscriptions: assembly.subscriptions,
    peopleByTeam: roster,
    totalPeople: [...roster.values()].reduce((sum, n) => sum + n, 0),
  });

  return [
    ...apontamentos.map((a) => ({
      id: `apontamento:${a.id}`,
      text: a.text,
      kind: a.kind === "unattributed" ? ("action" as const) : ("observation" as const),
      href: a.kind === "unattributed" ? "/ajustes/atribuicao" : undefined,
      actionLabel: a.kind === "unattributed" ? "Mapear atribuição" : undefined,
    })),
    ...seatWaste.map((w) => ({
      id: `seat:${w.id}`,
      text: w.text,
      kind: "action" as const,
      href: "/ajustes/assinaturas",
      actionLabel: "Revisar assinaturas",
    })),
  ];
}

export async function getHomeData(): Promise<HomeData> {
  const now = new Date();
  // None of the footer/delta reads need anything from the cockpit — one
  // parallel batch.
  const [assembly, weekRows, roster, weekCosts] = await Promise.all([
    assembleCockpit(),
    teamWeekChanges(now),
    rosterHeadcount(),
    orgWeekCosts(now),
  ]);

  const observations = buildObservations(assembly, weekRows, roster);
  const rosterTotal = [...roster.values()].reduce((sum, n) => sum + n, 0);

  return {
    cockpit: assembly.cockpit,
    period: assembly.period,
    stale: assembly.stale,
    fx: assembly.fx,
    observations,
    hasSeatWaste: observations.some((o) => o.id.startsWith("seat:")),
    orgWeekPct: weekOverWeek(weekCosts, now).pct,
    setup: {
      connected: assembly.connected,
      hasRoster: rosterTotal > 0,
      hasBudget: assembly.hasOrgBudget,
    },
  };
}

/**
 * Just the actionable subset of the observations feed — the header's
 * "Próximas ações" pop-up (global, on-demand). Same rules and reads as the Home
 * footer, filtered to kind "action". Runs under RLS, so it's tenant-scoped.
 */
export async function getNextActions(): Promise<Observation[]> {
  const now = new Date();
  const [assembly, weekRows, roster] = await Promise.all([
    assembleCockpit(),
    teamWeekChanges(now),
    rosterHeadcount(),
  ]);
  return buildObservations(assembly, weekRows, roster).filter(
    (o) => o.kind === "action",
  );
}
