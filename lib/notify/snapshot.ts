import "server-only";

import { attributeSeats, type SeatSubscription } from "@/lib/engine/accrual";
import {
  buildCockpit,
  evaluateScope,
  type Cockpit,
  type CockpitTeamInput,
} from "@/lib/engine/cockpit";
import type { BudgetEvaluation } from "@/lib/engine/budget";
import type { DriverInput } from "@/lib/engine/drivers";
import { currentPeriod, monthStartUtc, type Period } from "@/lib/engine/period";
import { createAdminClient } from "@/lib/supabase/admin";

import type { NotifiableUser } from "./recipients";

// Per-tenant read for the notification path (#20). The cron runs without a
// user session, so this is a service-role sibling of lib/home/queries.ts:
// every query is explicitly scoped by tenant_id, and all arithmetic stays in
// the pure engine (evaluateScope / buildCockpit) — assembled here, never
// computed here.

const DEFAULT_THRESHOLDS = [0.8, 1.0];
const UNATTRIBUTED_LABEL = "Não atribuído";
/** target_id used in notification_log for the org scope. */
export const ORG_TARGET = "org";

export type ScopeStatus = {
  scope: "org" | "team";
  /** null for the org (log key ORG_TARGET), team uuid otherwise. */
  targetId: string | null;
  targetName: string;
  evaluation: BudgetEvaluation;
  thresholds: number[];
};

export type TenantSnapshot = {
  currency: string;
  period: Period;
  periodEndLabel: string;
  monthLabel: string;
  /** Every budgeted scope this period — what alerts evaluate. */
  scopes: ScopeStatus[];
  /** Home view model for the digest; state "cold-start" when no org budget. */
  cockpit: Cockpit;
  /** Combined display spend per team (org frozen FX) — the org alert/digest
   *  drivers. Empty when the FX rate is missing (no dishonest mixed sum). */
  teamSpendDrivers: DriverInput[];
  users: NotifiableUser[];
  /** cost_daily rows covering the last 14 days, for week-over-week change. */
  recentCosts: { date: string; amount: number }[];
};

type BudgetRow = {
  scope: "org" | "team";
  team_id: string | null;
  amount: number;
  thresholds: number[] | null;
  frozen_fx_rate: number | null;
};
type SubscriptionRow = {
  tool: string;
  seat_count: number;
  unit_price: number;
  team_id: string | null;
};
type TeamRow = { id: string; name: string };
type UsageRow = {
  provider: string;
  project_id: string;
  derived_cost: number | null;
  uncosted: boolean;
};
type MapRow = { provider: string; project_id: string; team_id: string };
type CostRow = { date: string; provider: string; amount: number };
type UserRow = { email: string; role: string; digest_opt_out: boolean };

function isoDaysAgo(now: Date, days: number): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

export async function tenantSnapshot(
  tenantId: string,
  now: Date = new Date(),
): Promise<TenantSnapshot> {
  const admin = createAdminClient();
  const period = currentPeriod(now);
  const monthStart = monthStartUtc(now);
  // One window covers both the month-to-date totals and the 14-day change.
  const costSince =
    isoDaysAgo(now, 14) < monthStart ? isoDaysAgo(now, 14) : monthStart;

  const [
    { data: tenantData },
    { data: budgetData },
    { data: subData },
    { data: teamData },
    { data: usageData },
    { data: mapData },
    { data: costData },
    { data: userData },
  ] = await Promise.all([
    admin.from("tenant").select("display_currency").eq("id", tenantId).maybeSingle(),
    admin
      .from("budget")
      .select("scope, team_id, amount, thresholds, frozen_fx_rate")
      .eq("tenant_id", tenantId)
      .eq("period_month", monthStart),
    admin
      .from("subscription")
      .select("tool, seat_count, unit_price, team_id")
      .eq("tenant_id", tenantId),
    admin
      .from("team")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_unattributed", false),
    admin
      .from("usage_daily")
      .select("provider, project_id, derived_cost, uncosted")
      .eq("tenant_id", tenantId)
      .gte("date", monthStart),
    admin
      .from("project_map")
      .select("provider, project_id, team_id")
      .eq("tenant_id", tenantId),
    admin
      .from("cost_daily")
      .select("date, provider, amount")
      .eq("tenant_id", tenantId)
      .gte("date", costSince),
    admin
      .from("app_user")
      .select("email, role, digest_opt_out")
      .eq("tenant_id", tenantId),
  ]);

  const currency =
    (tenantData as { display_currency: string } | null)?.display_currency ?? "BRL";
  const budgets = (budgetData ?? []) as BudgetRow[];
  const teams = (teamData ?? []) as TeamRow[];
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  // Seats: accrued-to-date in the display currency, by team.
  const subs: SeatSubscription[] = ((subData ?? []) as SubscriptionRow[]).map(
    (s, i) => ({
      id: String(i),
      tool: s.tool,
      seatCount: s.seat_count,
      unitPrice: s.unit_price,
      teamId: s.team_id,
      teamName: s.team_id ? (teamName.get(s.team_id) ?? "—") : null,
    }),
  );
  const seats = attributeSeats(subs, period);
  const seatByTeam = new Map(seats.teams.map((t) => [t.teamId, t.accrued]));

  // API derived cost (USD) by team via project_map; unmapped → unattributed.
  const projectTeam = new Map(
    ((mapData ?? []) as MapRow[]).map((m) => [`${m.provider} ${m.project_id}`, m.team_id]),
  );
  const apiByTeam = new Map<string, number>();
  let apiUnattributed = 0;
  for (const row of (usageData ?? []) as UsageRow[]) {
    if (row.uncosted || row.derived_cost === null) continue;
    const teamId =
      row.project_id === ""
        ? undefined
        : projectTeam.get(`${row.provider} ${row.project_id}`);
    if (teamId === undefined) apiUnattributed += row.derived_cost;
    else apiByTeam.set(teamId, (apiByTeam.get(teamId) ?? 0) + row.derived_cost);
  }

  // Provider-reported cost (USD, headline truth): month-to-date + 14-day rows.
  const costs = (costData ?? []) as CostRow[];
  const monthCosts = costs.filter((c) => c.date >= monthStart);
  const reportedUsd = monthCosts.reduce((sum, c) => sum + c.amount, 0);
  const byProvider = new Map<string, number>();
  for (const c of monthCosts) {
    byProvider.set(c.provider, (byProvider.get(c.provider) ?? 0) + c.amount);
  }

  const orgBudget = budgets.find((b) => b.scope === "org") ?? null;
  const orgFx = orgBudget?.frozen_fx_rate ?? null;
  const periodEndLabel = `${period.daysInPeriod} de ${period.monthLabel}`;

  const cockpitTeams: CockpitTeamInput[] = budgets
    .filter((b) => b.scope === "team" && b.team_id !== null)
    .map((b) => ({
      teamId: b.team_id as string,
      teamName: teamName.get(b.team_id as string) ?? "—",
      budget: b.amount,
      seatDisplay: seatByTeam.get(b.team_id as string) ?? 0,
      apiUsd: apiByTeam.get(b.team_id as string) ?? 0,
      fxRate: b.frozen_fx_rate,
      thresholds: b.thresholds ?? DEFAULT_THRESHOLDS,
    }));

  const cockpit = buildCockpit({
    period,
    currency,
    periodEndLabel,
    org: orgBudget
      ? {
          budget: orgBudget.amount,
          seatDisplay: seats.orgTotal,
          apiUsd: reportedUsd,
          fxRate: orgFx,
          thresholds: orgBudget.thresholds ?? DEFAULT_THRESHOLDS,
        }
      : null,
    teams: cockpitTeams,
    composition: [...byProvider.entries()].map(([provider, usd]) => ({
      provider,
      usd,
    })),
  });

  // Alert scopes: every budgeted scope, evaluated by the same engine math the
  // home uses — including team budgets when there is no org budget yet.
  const scopes: ScopeStatus[] = [];
  if (orgBudget) {
    scopes.push({
      scope: "org",
      targetId: null,
      targetName: "Empresa",
      evaluation: evaluateScope(
        {
          budget: orgBudget.amount,
          seatDisplay: seats.orgTotal,
          apiUsd: reportedUsd,
          fxRate: orgFx,
        },
        period,
      ).evaluation,
      thresholds: orgBudget.thresholds ?? DEFAULT_THRESHOLDS,
    });
  }
  for (const t of cockpitTeams) {
    scopes.push({
      scope: "team",
      targetId: t.teamId,
      targetName: t.teamName,
      evaluation: evaluateScope(t, period).evaluation,
      thresholds: t.thresholds,
    });
  }

  // Org drivers: combined display spend per team. Only honest when the org FX
  // rate exists — otherwise USD and the display currency can't be summed.
  const teamSpendDrivers: DriverInput[] = [];
  if (orgFx !== null) {
    for (const t of teams) {
      teamSpendDrivers.push({
        label: t.name,
        value: (seatByTeam.get(t.id) ?? 0) + (apiByTeam.get(t.id) ?? 0) * orgFx,
      });
    }
    teamSpendDrivers.push({
      label: UNATTRIBUTED_LABEL,
      value: seats.unattributed + apiUnattributed * orgFx,
    });
  }

  return {
    currency,
    period,
    periodEndLabel,
    monthLabel: period.monthLabel,
    scopes,
    cockpit,
    teamSpendDrivers,
    users: ((userData ?? []) as UserRow[]).map((u) => ({
      email: u.email,
      role: u.role,
      digestOptOut: u.digest_opt_out,
    })),
    recentCosts: costs.map((c) => ({ date: c.date, amount: c.amount })),
  };
}
