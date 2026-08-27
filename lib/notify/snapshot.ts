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
import { periodFx } from "@/lib/engine/money-model";
import { combineTeamSpend } from "@/lib/engine/team-spend";
import { currentPeriod, monthStartUtc, type Period } from "@/lib/engine/period";
import { isoDaysAgo } from "@/lib/engine/week-change";
import {
  findNotifiableUsers,
  findNotificationBudgets,
  findNotificationProjectMap,
  findNotificationRecentCosts,
  findNotificationSubscriptions,
  findNotificationTeams,
  findNotificationUsage,
  findTenantDisplayCurrency,
  type NotificationBudgetRow,
} from "@/lib/db/admin";

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

export async function tenantSnapshot(
  tenantId: string,
  now: Date = new Date(),
): Promise<TenantSnapshot> {
  const period = currentPeriod(now);
  const monthStart = monthStartUtc(now);
  // One window covers both the month-to-date totals and the 14-day change.
  const costSince =
    isoDaysAgo(now, 14) < monthStart ? isoDaysAgo(now, 14) : monthStart;

  // The PostgREST path never checked these reads' `error` fields: a failed
  // query arrived as null/[] and the snapshot degraded to its defaults
  // (currency "BRL", no scopes). Each catch below replicates exactly that.
  const [
    currencyOrNull,
    budgets,
    subs,
    teams,
    usage,
    projectMap,
    costs,
    users,
  ] = await Promise.all([
    findTenantDisplayCurrency(tenantId).catch(() => null),
    findNotificationBudgets(tenantId, monthStart).catch(() => []),
    findNotificationSubscriptions(tenantId).catch(() => []),
    findNotificationTeams(tenantId).catch(() => []),
    findNotificationUsage(tenantId, monthStart).catch(() => []),
    findNotificationProjectMap(tenantId).catch(() => []),
    findNotificationRecentCosts(tenantId, costSince).catch(() => []),
    findNotifiableUsers(tenantId).catch(() => []),
  ]);

  const currency = currencyOrNull ?? "BRL";
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  // Seats: accrued-to-date in the display currency, by team.
  const seatSubs: SeatSubscription[] = subs.map(
    (s, i) => ({
      id: String(i),
      tool: s.tool,
      seatCount: s.seat_count,
      unitPrice: s.unit_price,
      teamId: s.team_id,
      teamName: s.team_id ? (teamName.get(s.team_id) ?? "—") : null,
    }),
  );
  const seats = attributeSeats(seatSubs, period);
  const seatByTeam = new Map(seats.teams.map((t) => [t.teamId, t.accrued]));

  // API derived cost (USD) by team via project_map; unmapped → unattributed.
  const projectTeam = new Map(
    projectMap.map((m) => [`${m.provider} ${m.project_id}`, m.team_id]),
  );
  const apiByTeam = new Map<string, number>();
  let apiUnattributed = 0;
  for (const row of usage) {
    if (row.uncosted || row.derived_cost === null) continue;
    const teamId =
      row.project_id === ""
        ? undefined
        : projectTeam.get(`${row.provider} ${row.project_id}`);
    if (teamId === undefined) apiUnattributed += row.derived_cost;
    else apiByTeam.set(teamId, (apiByTeam.get(teamId) ?? 0) + row.derived_cost);
  }

  // Provider-reported cost (USD, headline truth): month-to-date + 14-day rows.
  const monthCosts = costs.filter((c) => c.date >= monthStart);
  const reportedUsd = monthCosts.reduce((sum, c) => sum + c.amount, 0);
  const byProvider = new Map<string, number>();
  for (const c of monthCosts) {
    byProvider.set(c.provider, (byProvider.get(c.provider) ?? 0) + c.amount);
  }

  const orgBudget = budgets.find((b) => b.scope === "org") ?? null;
  // Same period-FX resolution as the screens (money-model contract) — an
  // e-mail total that disagreed with Home would burn the product's trust.
  const asCarrier = (b: NotificationBudgetRow) => ({
    frozenFxRate: b.frozen_fx_rate,
    fxRateSource: b.fx_rate_source,
    fxRateDate: b.fx_rate_date,
  });
  const orgFx =
    periodFx({
      org: orgBudget ? asCarrier(orgBudget) : null,
      teams: budgets
        .filter((b) => b.scope === "team")
        .map((b) => ({ ...asCarrier(b), teamId: b.team_id })),
    })?.rate ?? null;
  const periodEndLabel = `${period.daysInPeriod} de ${period.monthLabel}`;

  const cockpitTeams: CockpitTeamInput[] = budgets
    .filter((b) => b.scope === "team" && b.team_id !== null)
    .map((b) => ({
      teamId: b.team_id as string,
      teamName: teamName.get(b.team_id as string) ?? "—",
      budget: b.amount,
      seatDisplay: seatByTeam.get(b.team_id as string) ?? 0,
      apiUsd: apiByTeam.get(b.team_id as string) ?? 0,
      fxRate: orgFx,
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

  // Org drivers: combined display spend per team (shared engine helper —
  // null when the FX rate is missing, so no dishonest mixed-currency sum).
  const spendMix = combineTeamSpend({
    teams,
    seatByTeam,
    apiUsdByTeam: apiByTeam,
    seatUnattributed: seats.unattributed,
    apiUnattributedUsd: apiUnattributed,
    fxRate: orgFx,
  });
  const teamSpendDrivers: DriverInput[] = spendMix
    ? [
        ...spendMix.teamDrivers,
        { label: UNATTRIBUTED_LABEL, value: spendMix.unattributed },
      ]
    : [];

  return {
    currency,
    period,
    periodEndLabel,
    monthLabel: period.monthLabel,
    scopes,
    cockpit,
    teamSpendDrivers,
    users: users.map((u) => ({
      email: u.email,
      role: u.role,
      digestOptOut: u.digest_opt_out,
    })),
    recentCosts: costs.map((c) => ({ date: c.date, amount: c.amount })),
  };
}
