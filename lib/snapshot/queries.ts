import "server-only";

import type { SeatSubscription } from "@/lib/engine/accrual";
import { periodFx, type FrozenFx } from "@/lib/engine/money-model";
import { closedPeriod, monthRange } from "@/lib/engine/period";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapKey } from "@/lib/usage/attribution";

import type { PeriodSnapshotInput, SnapshotSource } from "./build";

// Reads for the closed-month snapshot (#94). Deliberately NOT a refactor of the
// query layer: every function in lib/*/queries.ts is zero-arg and resolves the
// current month internally, and threading a period through all of them would
// explode the blast radius. These are the few closed-window reads the closing
// job needs, bounded on BOTH ends (`.gte(start).lt(nextStart)`) — the live
// filters only have `.gte` and lean on "no future rows exist", which stops
// being true the moment you look at a month that is not the current one.
//
// Service-role, like the notification snapshot: the cron runs without a session,
// so every query is explicitly scoped by tenant_id.

const DEFAULT_THRESHOLDS = [0.8, 1.0];

type BudgetRow = {
  scope: "org" | "team";
  team_id: string | null;
  amount: number;
  thresholds: number[] | null;
  frozen_fx_rate: number | null;
  fx_rate_source: string | null;
  fx_rate_date: string | null;
};
type TeamRow = { id: string; name: string };
type SubscriptionRow = {
  id: string;
  tool: string;
  seat_count: number;
  unit_price: number;
  team_id: string | null;
};
type UsageRow = {
  provider: string;
  project_id: string;
  derived_cost: number | null;
  uncosted: boolean;
};
type MapRow = { provider: string; project_id: string; team_id: string };
type CostRow = { provider: string; amount: number };
type ConnectionRow = { status: string; last_sync_at: string | null };

/**
 * Everything the builder needs for one tenant's closed month. `source` decides
 * whether the seat half is captured: an `auto` close reads the live
 * subscriptions (the state as it stands, which for the month just ended is the
 * closest thing to the truth that exists), while a `backfill` records seats as
 * UNAVAILABLE — the configuration from that month is simply gone, and a zero
 * would be a guess dressed as a fact.
 */
export async function closedMonthInput(
  tenantId: string,
  year: number,
  month: number,
  options: { source: SnapshotSource; closedAt: string },
): Promise<PeriodSnapshotInput> {
  const admin = createAdminClient();
  const { start, nextStart } = monthRange(year, month);

  const [
    { data: tenantData },
    { data: budgetData },
    { data: teamData },
    { data: subData },
    { data: usageData },
    { data: mapData },
    { data: costData },
    { data: connectionData },
  ] = await Promise.all([
    admin.from("tenant").select("display_currency").eq("id", tenantId).maybeSingle(),
    admin
      .from("budget")
      .select(
        "scope, team_id, amount, thresholds, frozen_fx_rate, fx_rate_source, fx_rate_date",
      )
      .eq("tenant_id", tenantId)
      .eq("period_month", start),
    admin
      .from("team")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_unattributed", false)
      .order("name"),
    options.source === "auto"
      ? admin
          .from("subscription")
          .select("id, tool, seat_count, unit_price, team_id")
          .eq("tenant_id", tenantId)
      : Promise.resolve({ data: [] as SubscriptionRow[] }),
    admin
      .from("usage_daily")
      .select("provider, project_id, derived_cost, uncosted")
      .eq("tenant_id", tenantId)
      .gte("date", start)
      .lt("date", nextStart),
    admin
      .from("project_map")
      .select("provider, project_id, team_id")
      .eq("tenant_id", tenantId),
    admin
      .from("cost_daily")
      .select("provider, amount")
      .eq("tenant_id", tenantId)
      .gte("date", start)
      .lt("date", nextStart),
    admin
      .from("provider_connection")
      .select("status, last_sync_at")
      .eq("tenant_id", tenantId),
  ]);

  const currency =
    (tenantData as { display_currency: string } | null)?.display_currency ?? "BRL";
  const budgets = (budgetData ?? []) as BudgetRow[];
  const teams = ((teamData ?? []) as TeamRow[]).map((t) => ({
    id: t.id,
    name: t.name,
  }));
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  const orgBudgetRow = budgets.find((b) => b.scope === "org") ?? null;
  const asCarrier = (b: BudgetRow) => ({
    frozenFxRate: b.frozen_fx_rate,
    fxRateSource: b.fx_rate_source,
    fxRateDate: b.fx_rate_date,
  });
  // The SAME rate resolution the screens use (money-model contract) — a frozen
  // month that converted differently from the month itself would be a new number.
  const fx: FrozenFx | null = periodFx({
    org: orgBudgetRow ? asCarrier(orgBudgetRow) : null,
    teams: budgets
      .filter((b) => b.scope === "team")
      .map((b) => ({ ...asCarrier(b), teamId: b.team_id })),
  });

  const subscriptions: SeatSubscription[] = ((subData ?? []) as SubscriptionRow[]).map(
    (s) => ({
      id: s.id,
      tool: s.tool,
      seatCount: s.seat_count,
      unitPrice: s.unit_price,
      teamId: s.team_id,
      teamName: s.team_id ? (teamName.get(s.team_id) ?? "—") : null,
    }),
  );

  // Derived API cost by team via project_map; anything unmapped is the
  // first-class Unattributed bucket (invariant #3 — spend never disappears).
  const projectTeam = new Map(
    ((mapData ?? []) as MapRow[]).map((m) => [mapKey(m.provider, m.project_id), m.team_id]),
  );
  const apiUsdByTeam = new Map<string, number>();
  let apiUnattributedUsd = 0;
  let derivedUsd = 0;
  let hasUncosted = false;
  for (const row of (usageData ?? []) as UsageRow[]) {
    if (row.uncosted || row.derived_cost === null) {
      hasUncosted = true;
      continue;
    }
    derivedUsd += row.derived_cost;
    const teamId =
      row.project_id === ""
        ? undefined
        : projectTeam.get(mapKey(row.provider, row.project_id));
    if (teamId === undefined) apiUnattributedUsd += row.derived_cost;
    else apiUsdByTeam.set(teamId, (apiUsdByTeam.get(teamId) ?? 0) + row.derived_cost);
  }

  const byProvider = new Map<string, number>();
  for (const row of (costData ?? []) as CostRow[]) {
    byProvider.set(row.provider, (byProvider.get(row.provider) ?? 0) + row.amount);
  }

  return {
    period: closedPeriod(year, month),
    currency,
    source: options.source,
    closedAt: options.closedAt,
    orgBudget: orgBudgetRow
      ? {
          amount: orgBudgetRow.amount,
          thresholds: orgBudgetRow.thresholds ?? DEFAULT_THRESHOLDS,
        }
      : null,
    teamBudgets: budgets
      .filter((b) => b.scope === "team" && b.team_id !== null)
      .map((b) => ({
        teamId: b.team_id as string,
        amount: b.amount,
        thresholds: b.thresholds ?? DEFAULT_THRESHOLDS,
      })),
    fx,
    teams,
    seats:
      options.source === "auto"
        ? { available: true, subscriptions }
        : { available: false },
    apiUsdByTeam,
    apiUnattributedUsd,
    reportedByProvider: [...byProvider.entries()]
      .map(([provider, usd]) => ({ provider, usd }))
      .sort((a, b) => b.usd - a.usd),
    derivedUsd,
    hasUncosted,
    connections: ((connectionData ?? []) as ConnectionRow[]).map((c) => ({
      status: c.status,
      lastSyncAt: c.last_sync_at,
    })),
  };
}

/** Tenants that already existed when the month ended — a month a customer was
 *  not there for is not a month to report on. */
export async function tenantsExistingBefore(nextStart: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant")
    .select("id")
    .lt("created_at", `${nextStart}T00:00:00.000Z`);
  return ((data ?? []) as { id: string }[]).map((t) => t.id);
}

/** period_month values already frozen for a tenant (yyyy-mm-dd). */
export async function closedMonths(tenantId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("period_snapshot")
    .select("period_month")
    .eq("tenant_id", tenantId);
  return new Set(((data ?? []) as { period_month: string }[]).map((r) => r.period_month));
}

/** Distinct months (yyyy-mm-01) in which the tenant has reported API cost —
 *  the candidates a backfill can defensibly reconstruct. */
export async function monthsWithCost(
  tenantId: string,
  since: string,
  before: string,
): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("cost_daily")
    .select("date")
    .eq("tenant_id", tenantId)
    .gte("date", since)
    .lt("date", before);
  const months = new Set(
    ((data ?? []) as { date: string }[]).map((r) => `${r.date.slice(0, 7)}-01`),
  );
  return [...months].sort();
}
