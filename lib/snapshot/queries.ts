import "server-only";

import type { SeatSubscription } from "@/lib/engine/accrual";
import type { ConnectionStatus } from "@/lib/engine/freshness";
import {
  findNotificationBudgets,
  findNotificationProjectMap,
  findSnapshotConnections,
  findSnapshotCostsForPeriod,
  findSnapshotSubscriptions,
  findSnapshotTeamsOrdered,
  findSnapshotUsageForPeriod,
  findTenantDisplayCurrency,
  listClosedSnapshotMonths,
  listMonthsWithCost,
  listTenantsExistingBefore,
  type NotificationBudgetRow,
} from "@/lib/db/admin";
import { periodFx, type FrozenFx } from "@/lib/engine/money-model";
import { closedPeriod, monthRange } from "@/lib/engine/period";
import { mapKey } from "@/lib/usage/attribution";

import type { PeriodSnapshotInput, PersistedSource } from "./build";

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

type BudgetRow = NotificationBudgetRow;
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
type ConnectionRow = {
  provider: string;
  status: string;
  last_sync_at: string | null;
};

/**
 * The PostgREST path aggregated every read's error code into one thrown
 * message ("snapshot reads failed: name:code,..."); the direct driver throws
 * per query instead. This reproduces that exact message from whichever reads
 * rejected, so platform logs keep matching the old format.
 */
function failedReadCode(cause: unknown): string {
  return (
    ((cause as { code?: unknown } | null)?.code as string | undefined) ?? "unknown"
  );
}

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
  options: { source: PersistedSource; closedAt: string },
): Promise<PeriodSnapshotInput> {
  const { start, nextStart } = monthRange(year, month);

  const [
    tenantSettled,
    budgetSettled,
    teamSettled,
    subscriptionSettled,
    usageSettled,
    mapSettled,
    costSettled,
    connectionSettled,
  ] = await Promise.allSettled([
    findTenantDisplayCurrency(tenantId),
    findNotificationBudgets(tenantId, start),
    findSnapshotTeamsOrdered(tenantId),
    options.source === "auto"
      ? findSnapshotSubscriptions(tenantId)
      : Promise.resolve([] as Awaited<ReturnType<typeof findSnapshotSubscriptions>>),
    findSnapshotUsageForPeriod(tenantId, start, nextStart),
    findNotificationProjectMap(tenantId),
    findSnapshotCostsForPeriod(tenantId, start, nextStart),
    findSnapshotConnections(tenantId),
  ]);

  // Same aggregated contract as before: one thrown message naming every
  // failing read by table and Postgres code, never a row value.
  const names = [
    "tenant",
    "budget",
    "team",
    "subscription",
    "usage_daily",
    "project_map",
    "cost_daily",
    "provider_connection",
  ] as const;
  const settled = [tenantSettled, budgetSettled, teamSettled, subscriptionSettled, usageSettled, mapSettled, costSettled, connectionSettled];
  const failures = settled
    .map((s, i) => (s.status === "rejected" ? `${names[i]}:${failedReadCode(s.reason)}` : null))
    .filter((f): f is string => f !== null);
  if (failures.length > 0) {
    throw new Error(`snapshot reads failed: ${failures.join(",")}`);
  }

  const [currencyOrNull, budgets, teams, subRows, usage, projectMap, costs, connections] =
    settled.map(
      (
        s,
      ): unknown =>
        s.status === "fulfilled" ? s.value : null,
    ) as [string | null, BudgetRow[], TeamRow[], SubscriptionRow[], UsageRow[], MapRow[], CostRow[], ConnectionRow[]];

  const currency = currencyOrNull ?? "BRL";
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

  const subscriptions: SeatSubscription[] = subRows.map(
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
    projectMap.map((m) => [mapKey(m.provider, m.project_id), m.team_id]),
  );
  const apiUsdByTeam = new Map<string, number>();
  let apiUnattributedUsd = 0;
  let derivedUsd = 0;
  let hasUncosted = false;
  for (const row of usage) {
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
  for (const row of costs) {
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
    connections: connections.map(
      (c): ConnectionStatus => ({
        provider: c.provider as ConnectionStatus["provider"],
        status: c.status,
        lastSyncAt: c.last_sync_at,
      }),
    ),
  };
}

/** Tenants that already existed when the month ended — a month a customer was
 *  not there for is not a month to report on. */
export async function tenantsExistingBefore(nextStart: string): Promise<string[]> {
  try {
    return await listTenantsExistingBefore(nextStart);
  } catch (cause) {
    throw new Error(`snapshot reads failed: tenant:${failedReadCode(cause)}`);
  }
}

/** period_month values already frozen for a tenant (yyyy-mm-dd). */
export async function closedMonths(tenantId: string): Promise<Set<string>> {
  let rows: string[];
  try {
    rows = await listClosedSnapshotMonths(tenantId);
  } catch (cause) {
    throw new Error(`snapshot reads failed: period_snapshot:${failedReadCode(cause)}`);
  }
  return new Set(rows);
}

/** Distinct months (yyyy-mm-01) in which the tenant has reported API cost —
 *  the candidates a backfill can defensibly reconstruct. */
export async function monthsWithCost(
  tenantId: string,
  since: string,
  before: string,
): Promise<string[]> {
  try {
    return await listMonthsWithCost(tenantId, since, before);
  } catch (cause) {
    throw new Error(`snapshot reads failed: cost_daily:${failedReadCode(cause)}`);
  }
}
