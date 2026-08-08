import "server-only";

import { monthRange, previousMonthOf } from "@/lib/engine/period";
import { createAdminClient } from "@/lib/supabase/admin";

import { buildPeriodSnapshot, type PeriodSnapshot, type PersistedSource } from "./build";
import {
  closedMonthInput,
  closedMonths,
  monthsWithCost,
  tenantsExistingBefore,
} from "./queries";

// Closing the month (#94). Runs from the daily sync cron — the one deliberate
// cross-tenant path — AFTER the sync and the alerts, so the month being frozen
// is as complete as the connectors could make it.
//
// Idempotence is the unique key's job: the insert ignores a conflict on
// (tenant_id, period_month), so a second run of the day (or of the month)
// creates nothing. A frozen month is never rewritten — that is the whole point.

/** How far back a backfill will look for months worth reconstructing. */
const BACKFILL_MONTHS = 12;
/** Keep the daily cron inside its 60-second budget. Later runs continue. */
const MAX_BACKFILLS_PER_TENANT_PER_RUN = 1;

function toRow(tenantId: string, snapshot: PeriodSnapshot) {
  return {
    tenant_id: tenantId,
    period_month: snapshot.periodMonth,
    closed_at: snapshot.closedAt,
    source: snapshot.source,
    currency: snapshot.currency,
    api_usd: snapshot.apiUsd,
    seats_amount: snapshot.seatsAmount,
    combined_amount: snapshot.combinedAmount,
    budget_amount: snapshot.budgetAmount,
    pct_spent: snapshot.pctSpent,
    frozen_fx_rate: snapshot.frozenFxRate,
    fx_rate_source: snapshot.fxRateSource,
    fx_rate_date: snapshot.fxRateDate,
    verdict_status: snapshot.verdictStatus,
    verdict_sentence: snapshot.verdictSentence,
    breakdown: snapshot.breakdown,
    has_uncosted: snapshot.hasUncosted,
    reconciliation_ok: snapshot.reconciliationOk,
    fx_missing: snapshot.fxMissing,
    stale_sync: snapshot.staleSync,
  };
}

export type CloseOutcome = "created" | "exists" | "failed";

/** Freezes one tenant's month. Returns "exists" when it was already frozen. */
export async function closeMonth(
  tenantId: string,
  year: number,
  month: number,
  source: PersistedSource,
  now: Date = new Date(),
  knownClosedMonths?: ReadonlySet<string>,
): Promise<CloseOutcome> {
  try {
    const already = knownClosedMonths ?? (await closedMonths(tenantId));
    const { start } = monthRange(year, month);
    if (already.has(start)) return "exists";

    const input = await closedMonthInput(tenantId, year, month, {
      source,
      closedAt: now.toISOString(),
    });
    const snapshot = buildPeriodSnapshot(input);

    const admin = createAdminClient();
    const { error } = await admin
      .from("period_snapshot")
      .upsert(toRow(tenantId, snapshot), {
        onConflict: "tenant_id,period_month",
        ignoreDuplicates: true,
      });
    return error ? "failed" : "created";
  } catch {
    // One unreadable tenant/month must not stop the cross-tenant cron.
    return "failed";
  }
}

export type CloseSummary = {
  tenants: number;
  created: number;
  backfilled: number;
  failed: number;
};

/**
 * Closes the previous month for every tenant that existed when it ended, then
 * backfills any earlier month that has reported cost but no snapshot. A
 * backfilled month records what is defensible (the API side) and discloses the
 * seat half as unavailable — the configuration from back then is gone, and a
 * zero would be a guess wearing a number's clothes.
 */
export async function closePeriods(now: Date = new Date()): Promise<CloseSummary> {
  const previous = previousMonthOf(now);
  const { start: previousStart, nextStart } = monthRange(previous.year, previous.month);
  let tenants: string[];
  try {
    tenants = await tenantsExistingBefore(nextStart);
  } catch {
    return { tenants: 0, created: 0, backfilled: 0, failed: 1 };
  }

  const summary: CloseSummary = {
    tenants: tenants.length,
    created: 0,
    backfilled: 0,
    failed: 0,
  };

  const backfillFloor = new Date(
    Date.UTC(previous.year, previous.month - 1 - BACKFILL_MONTHS, 1),
  )
    .toISOString()
    .slice(0, 10);

  for (const tenantId of tenants) {
    try {
      // One read per tenant, reused by the auto close and every backfill.
      const frozen = await closedMonths(tenantId);
      const outcome = await closeMonth(
        tenantId,
        previous.year,
        previous.month,
        "auto",
        now,
        frozen,
      );
      if (outcome === "created") {
        summary.created += 1;
        frozen.add(previousStart);
      }
      if (outcome === "failed") {
        summary.failed += 1;
        continue;
      }

      const candidates = await monthsWithCost(tenantId, backfillFloor, previousStart);
      let attempted = 0;
      for (const monthStart of candidates) {
        if (frozen.has(monthStart)) continue;
        if (attempted >= MAX_BACKFILLS_PER_TENANT_PER_RUN) break;
        attempted += 1;

        const [year, month] = monthStart.split("-").map(Number);
        const result = await closeMonth(
          tenantId,
          year,
          month,
          "backfill",
          now,
          frozen,
        );
        if (result === "created") {
          summary.backfilled += 1;
          frozen.add(monthStart);
        }
        if (result === "failed") summary.failed += 1;
      }
    } catch {
      summary.failed += 1;
      continue;
    }
  }

  return summary;
}
