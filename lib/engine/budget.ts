// Denarius engine — budget evaluation (pure, no I/O). THE HERO's arithmetic:
// given how much has been spent, the budget, and where we are in the period,
// derive the run-rate projection, the day-5 guard, current & projected margin,
// and the pacing pair (% spent vs % elapsed). Every number the verdict, the
// findings and the home cockpit show comes from here — deterministic, so the
// LLM narrates it and never computes it (invariant #2).

import type { PeriodProgress } from "./accrual";

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
}): BudgetEvaluation {
  const { budget, spent, period } = input;
  const proj = projection(spent, period);
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
