import "server-only";

import type {
  PeriodSnapshot,
  PersistedSource,
  SnapshotBreakdown,
} from "@/lib/snapshot/build";
import { closedPeriod, monthLabelOf } from "@/lib/engine/period";
import { createClient } from "@/lib/supabase/server";

const SUMMARY_COLUMNS =
  "period_month, closed_at, currency, combined_amount, budget_amount, verdict_status, verdict_sentence, has_uncosted, reconciliation_ok, fx_missing, stale_sync";
const DETAIL_COLUMNS = `${SUMMARY_COLUMNS}, source, api_usd, seats_amount, pct_spent, frozen_fx_rate, fx_rate_source, fx_rate_date, breakdown, tenant:tenant_id(name)`;

type VerdictStatus = PeriodSnapshot["verdictStatus"];

type SummaryRow = {
  period_month: string;
  closed_at: string;
  currency: string;
  combined_amount: number | null;
  budget_amount: number | null;
  verdict_status: VerdictStatus;
  verdict_sentence: string | null;
  has_uncosted: boolean;
  reconciliation_ok: boolean;
  fx_missing: boolean;
  stale_sync: boolean;
};

type DetailRow = SummaryRow & {
  source: PersistedSource;
  api_usd: number;
  seats_amount: number | null;
  pct_spent: number | null;
  frozen_fx_rate: number | null;
  fx_rate_source: string | null;
  fx_rate_date: string | null;
  breakdown: SnapshotBreakdown;
  tenant: { name: string } | null;
};

export type ReportSummary = {
  periodMonth: string;
  closedAt: string;
  currency: string;
  combinedAmount: number | null;
  budgetAmount: number | null;
  verdictStatus: VerdictStatus;
  verdictSentence: string | null;
  caveatCount: number;
};

export type MonthlyReport = PeriodSnapshot & { companyName: string };

function countCaveats(row: SummaryRow): number {
  return (
    Number(row.has_uncosted) +
    Number(!row.reconciliation_ok) +
    Number(row.fx_missing) +
    Number(row.stale_sync)
  );
}

function toSummary(row: SummaryRow): ReportSummary {
  return {
    periodMonth: row.period_month,
    closedAt: row.closed_at,
    currency: row.currency,
    combinedAmount: row.combined_amount,
    budgetAmount: row.budget_amount,
    verdictStatus: row.verdict_status,
    verdictSentence: row.verdict_sentence,
    caveatCount: countCaveats(row),
  };
}

/**
 * A frozen `breakdown` is whatever the builder wrote the day it was written.
 * Months closed before `findings` and per-team `projection` existed simply do
 * not carry them, and backfilling a value would put a number in an artifact the
 * freeze never asserted. Absent reads as "none", which is also the truthful
 * answer for a month that has already ended: there is no pace left to project
 * and no action left to recommend.
 */
function withBreakdownDefaults(breakdown: SnapshotBreakdown): SnapshotBreakdown {
  return {
    ...breakdown,
    findings: breakdown.findings ?? [],
    teams: (breakdown.teams ?? []).map((team) => ({
      ...team,
      projection: team.projection ?? null,
    })),
  };
}

function toMonthlyReport(row: DetailRow): MonthlyReport {
  if (!row.tenant) throw new Error("report tenant relationship missing");
  const [year, month] = row.period_month.split("-").map(Number);
  // A frozen month is fully elapsed by definition, so its day counters are
  // derived rather than stored.
  const period = closedPeriod(year, month);

  return {
    companyName: row.tenant.name,
    periodMonth: row.period_month,
    monthLabel: monthLabelOf(year, month),
    closedAt: row.closed_at,
    source: row.source,
    dayOfPeriod: period.dayOfPeriod,
    daysInPeriod: period.daysInPeriod,
    currency: row.currency,
    apiUsd: row.api_usd,
    seatsAmount: row.seats_amount,
    combinedAmount: row.combined_amount,
    budgetAmount: row.budget_amount,
    pctSpent: row.pct_spent,
    // Not a stored column: a closed month has nothing left to project, and the
    // closed template never shows the field. Null means "not recoverable", not
    // "still collecting" — inventing the realized total here would put a number
    // in the report that the freeze never asserted.
    projection: null,
    frozenFxRate: row.frozen_fx_rate,
    fxRateSource: row.fx_rate_source,
    fxRateDate: row.fx_rate_date,
    verdictStatus: row.verdict_status,
    verdictSentence: row.verdict_sentence,
    breakdown: withBreakdownDefaults(row.breakdown),
    hasUncosted: row.has_uncosted,
    reconciliationOk: row.reconciliation_ok,
    fxMissing: row.fx_missing,
    staleSync: row.stale_sync,
  };
}

export type ReportListRead =
  | { ok: true; reports: ReportSummary[] }
  | { ok: false; reports: [] };

/** The list has one data source: the immutable period_snapshot table. */
export async function listMonthlyReports(): Promise<ReportListRead> {
  const client = await createClient();
  const { data, error } = await client
    .from("period_snapshot")
    .select(SUMMARY_COLUMNS)
    .order("period_month", { ascending: false });
  if (error) {
    console.error(`[reports] list read failed:${error.code ?? "unknown"}`);
    return { ok: false, reports: [] };
  }
  return { ok: true, reports: ((data ?? []) as SummaryRow[]).map(toSummary) };
}

/**
 * Reads the frozen row and its owning company name in one relationship query.
 * No budget, usage, cost, subscription or provider table is touched here.
 */
export async function monthlyReport(period: string): Promise<MonthlyReport | null> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return null;

  const client = await createClient();
  const { data, error } = await client
    .from("period_snapshot")
    .select(DETAIL_COLUMNS)
    .eq("period_month", `${period}-01`)
    .maybeSingle();
  if (error) throw new Error(`report snapshot read failed:${error.code ?? "unknown"}`);
  return data ? toMonthlyReport(data as unknown as DetailRow) : null;
}
