// Denarius engine — budget evaluation (pure, no I/O). THE HERO's arithmetic:
// given how much has been spent, the budget, and where we are in the period,
// derive the run-rate projection, the day-5 guard, current & projected margin,
// and the pacing pair (% spent vs % elapsed). Every number the verdict, the
// findings and the home cockpit show comes from here — deterministic, so the
// LLM narrates it and never computes it (invariant #2).

import type { PeriodProgress } from "./accrual";
import { forecast, type DailySpendPoint, type ForecastResult } from "./forecast";

/**
 * Run-rate projection is suppressed before this day of the period. Early-month
 * pace is noise: on day 2, a single spike would project an absurd close and
 * fire false alarms. The UI shows "collecting pace…" until the guard lifts
 * (invariant #5).
 */
export const PROJECTION_GUARD_DAY = 5;

// A projection must clear the budget by more than a sub-cent to count as a
// projected breach — otherwise linear run-rate rounding (e.g. 500/15×30 =
// 1000.0000000001) would falsely trip a breach for a budget landing exactly on
// pace. Half a cent is below any real currency granularity.
const BREACH_EPSILON = 0.005;

/** True while the projection guard suppresses run-rate math (before day 5). */
export function isCollecting(dayOfPeriod: number): boolean {
  return dayOfPeriod < PROJECTION_GUARD_DAY;
}

/**
 * Per-day governed spend points (display currency) for the behavior-aware
 * forecast: provider-reported API USD per day converted at the frozen FX plus
 * seats spread evenly across elapsed days. Days without observed API cost are
 * OMITTED (never zero-filled) so the engine distinguishes "no data" from
 * "no spend". Returns undefined when no honest series exists — missing FX with
 * API spend, or nothing elapsed — so callers fall back to linear run-rate
 * instead of forecasting on a guessed series (invariant #3/#4).
 */
export function governedDailySpend(input: {
  apiByDay: { date: string; usd: number }[];
  fxRate: number | null;
  seatAccrued: number;
  monthStart: string;
  dayOfPeriod: number;
}): DailySpendPoint[] | undefined {
  const { apiByDay, fxRate, seatAccrued, monthStart, dayOfPeriod } = input;
  if (dayOfPeriod <= 0) return undefined;
  const start = Date.parse(`${monthStart}T00:00:00Z`);
  if (Number.isNaN(start)) return undefined;
  const usdByDate = new Map<string, number>();
  for (const row of apiByDay) usdByDate.set(row.date, (usdByDate.get(row.date) ?? 0) + row.usd);
  const hasApi = [...usdByDate.values()].some((usd) => usd > 0);
  if (hasApi && (fxRate === null || !(fxRate > 0))) return undefined;
  const seatPerDay = seatAccrued / dayOfPeriod;
  const points: DailySpendPoint[] = [];
  for (let day = 1; day <= dayOfPeriod; day++) {
    const date = new Date(start + (day - 1) * 86_400_000).toISOString().slice(0, 10);
    const apiUsd = usdByDate.get(date) ?? 0;
    if (apiUsd === 0 && seatPerDay === 0) continue;
    points.push({ date, amount: apiUsd * (fxRate ?? 0) + seatPerDay });
  }
  return points.length > 0 ? points : undefined;
}

/**
 * Linear run-rate close for the period: spend ÷ days-elapsed × days-in-period.
 * Raw — the day-5 guard is applied by `projection()` / `evaluateBudget()`.
 */
export function runRate(spent: number, period: PeriodProgress): number {
  const { dayOfPeriod, daysInPeriod } = period;
  if (dayOfPeriod <= 0) return 0;
  return (spent / dayOfPeriod) * daysInPeriod;
}

/** Run-rate projection, or null while the day-5 guard holds. */
export function projection(spent: number, period: PeriodProgress): number | null {
  if (isCollecting(period.dayOfPeriod)) return null;
  return runRate(spent, period);
}

export function behaviorAwareProjection(input: {
  spent: number;
  period: PeriodProgress;
  dailySpend?: DailySpendPoint[];
  history?: DailySpendPoint[];
}): { projection: number | null; forecast: ForecastResult | null } {
  if (!input.dailySpend) return { projection: projection(input.spent, input.period), forecast: null };
  const result = forecast({ dailySpend: input.dailySpend, history: input.history, spent: input.spent, period: input.period });
  return { projection: result.centralEstimate, forecast: result };
}

/**
 * Total tracked spend in the DISPLAY currency: seat accrual (already stored in
 * the display currency) + API cost (stored in USD) converted at the budget's
 * frozen FX rate. When the rate is unavailable, the USD part can't be honestly
 * converted, so it is reported separately as `unconvertedUsd` rather than being
 * guessed into the total (error-handling rule: show the gap, never a guess).
 */
export function combinedSpend(input: {
  seatDisplay: number;
  apiUsd: number;
  fxRate: number | null;
}): { display: number; unconvertedUsd: number } {
  const { seatDisplay, apiUsd, fxRate } = input;
  if (fxRate === null) {
    return { display: seatDisplay, unconvertedUsd: apiUsd };
  }
  return { display: seatDisplay + apiUsd * fxRate, unconvertedUsd: 0 };
}

export type BudgetEvaluation = {
  budget: number;
  spent: number;
  /** null while the projection guard holds (before day 5). */
  projection: number | null;
  /** budget − spent. De-emphasized in the UI (mid-period it reads as false comfort). */
  currentMargin: number;
  /** budget − projection — the headline metric. null while collecting. */
  projectedMargin: number | null;
  /** spent ÷ budget (0..∞). */
  pctSpent: number;
  /** day ÷ days-in-period (0..1) — the time half of the pacing pair. */
  pctElapsed: number;
  collecting: boolean;
  /** spent already met or passed the budget. */
  breached: boolean;
  /** projection passes the budget (only meaningful once the guard lifts). */
  projectedBreach: boolean;
};

/** Full budget picture for one scope (org or team) at `period`. */
export function evaluateBudget(input: {
  budget: number;
  spent: number;
  period: PeriodProgress;
  dailySpend?: DailySpendPoint[];
  history?: DailySpendPoint[];
}): BudgetEvaluation {
  const { budget, spent, period, dailySpend, history } = input;
  const proj = dailySpend
    ? forecast({ dailySpend, history, spent, period, budget }).centralEstimate
    : projection(spent, period);
  const collecting = isCollecting(period.dayOfPeriod);

  return {
    budget,
    spent,
    projection: proj,
    currentMargin: budget - spent,
    projectedMargin: proj === null ? null : budget - proj,
    pctSpent: budget > 0 ? spent / budget : 0,
    pctElapsed:
      period.daysInPeriod > 0
        ? Math.min(period.dayOfPeriod, period.daysInPeriod) / period.daysInPeriod
        : 0,
    collecting,
    breached: budget > 0 && spent >= budget,
    projectedBreach: proj !== null && budget > 0 && proj - budget > BREACH_EPSILON,
  };
}
