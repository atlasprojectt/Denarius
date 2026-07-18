// Denarius engine — the Home "Evolução do mês" series (pure, no I/O). Composes
// the realized cumulative spend (buildCumulativeSpend — same frozen-FX combine
// as every evaluation, so the last realized point lands exactly on spent-to-date,
// invariant #3) with the run-rate projection tail, the per-day spend bars, the
// expected-pace reference and the projected budget crossing. One row PER DAY of
// the period, so the chart shows the real evolution instead of a three-point
// diagonal. The LLM/UI never computes any of this (invariant #2).

import { buildCumulativeSpend, type DailyUsd } from "./cumulative";

export type { DailyUsd };

export type MonthlyPaceRow = {
  /** Day of the period, 1-based (1..daysInPeriod). */
  day: number;
  /** Cumulative realized spend through that day; null after today. */
  realized: number | null;
  /** Cumulative projected spend; non-null only from today to the close, and
   *  equal to `realized` at today so the tail starts on the last real point. */
  projected: number | null;
  /** That day's spend (the bottom bar); null for future days. */
  daily: number | null;
  /** Expected-pace cumulative at that day (budget spread evenly); null without
   *  a positive budget. A neutral reference — never a status. */
  pace: number | null;
  /** Projected value clamped to the budget for the red overrun band — set only
   *  on projected days that exceed the budget; null everywhere else (the
   *  realized region is never red). */
  overrun: number | null;
};

export type MonthlyPace = {
  rows: MonthlyPaceRow[];
  /** Elapsed day of the period (the realized/projection boundary). */
  todayDay: number;
  /** Cumulative realized spend today — equals the evaluation's spent-to-date. */
  todayValue: number;
  /** Expected pace at today; null without a positive budget. */
  paceToday: number | null;
  /** Run-rate close, or null while the day-5 guard holds (collecting). */
  projection: number | null;
  budget: number;
  /** The day the projection is estimated to cross the budget (fractional,
   *  1-based), when spend is under budget today but projected to breach; null
   *  otherwise. Presentation formats the calendar date from it. */
  crossing: { day: number } | null;
};

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Full-month pace series for the org scope. Realized days come from
 * `buildCumulativeSpend`; the projection tail is the linear run-rate from today
 * to the period close; daily bars are the first differences of the realized
 * cumulative; the pace line is the budget spread evenly. All combine semantics
 * (frozen FX, seats spread evenly, API dropped when FX is missing) are inherited
 * from `buildCumulativeSpend`, so the chart can never disagree with the numbers.
 */
export function buildMonthlyPace(input: {
  apiByDay: DailyUsd[];
  fxRate: number | null;
  /** Seat cost accrued through today, display currency. */
  seatAccrued: number;
  budget: number;
  projection: number | null;
  dayOfPeriod: number;
  daysInPeriod: number;
}): MonthlyPace {
  const {
    apiByDay,
    fxRate,
    seatAccrued,
    budget,
    projection,
    dayOfPeriod,
    daysInPeriod,
  } = input;

  const today = Math.max(0, Math.min(dayOfPeriod, daysInPeriod));
  const realizedPoints = buildCumulativeSpend({
    apiByDay,
    fxRate,
    seatAccrued,
    dayOfPeriod: today,
  });
  const realizedByDay = new Map(realizedPoints.map((p) => [p.day, p.spent]));
  const todayValue = realizedPoints.at(-1)?.spent ?? 0;

  // Projection tail: linear from (today, todayValue) to (close, projection).
  // Only meaningful once the day-5 guard lifts and there is room left to close.
  const hasTail =
    projection !== null && today >= 1 && daysInPeriod > today;
  const projectedAt = (day: number): number => {
    if (day === today) return todayValue; // shared vertex — no duplicate point
    const span = daysInPeriod - today;
    const t = (day - today) / span;
    return todayValue + ((projection as number) - todayValue) * t;
  };

  const paceAt = (day: number): number | null =>
    budget > 0 && daysInPeriod > 0 ? (budget / daysInPeriod) * day : null;

  const rows: MonthlyPaceRow[] = [];
  for (let day = 1; day <= daysInPeriod; day++) {
    const realized = day <= today ? (realizedByDay.get(day) ?? 0) : null;
    const prev = day <= today ? (realizedByDay.get(day - 1) ?? 0) : null;
    const daily = realized !== null && prev !== null ? roundCents(realized - prev) : null;

    const projected = hasTail && day >= today ? projectedAt(day) : null;
    const overrun = projected !== null && projected > budget ? projected : null;

    rows.push({
      day,
      realized,
      projected,
      daily,
      pace: paceAt(day),
      overrun,
    });
  }

  // Crossing: the projection passes the budget between today and the close.
  // Only when we are under budget today (a realized breach has no future
  // crossing) and the projection actually clears it.
  let crossing: { day: number } | null = null;
  if (hasTail && todayValue < budget && (projection as number) > budget) {
    const span = daysInPeriod - today;
    const frac = (budget - todayValue) / ((projection as number) - todayValue);
    crossing = { day: today + frac * span };
  }

  return {
    rows,
    todayDay: today,
    todayValue,
    paceToday: paceAt(today),
    projection,
    budget,
    crossing,
  };
}
