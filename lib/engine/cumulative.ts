// Denarius engine — cumulative daily spend series for the team drill-down
// chart (pure, no I/O). Mirrors the combine semantics the evaluations use
// (lib/engine/budget.ts combinedSpend): API USD converts at the frozen FX and
// is EXCLUDED when the rate is missing (disclosed elsewhere, never guessed —
// invariant #4); manual seats accrue linearly (lib/engine/accrual.ts), so the
// accrued-to-date total spreads evenly across elapsed days. The last point
// therefore lands exactly on the evaluation's spent-to-date — the chart and
// the numbers can never disagree (invariant #3).

export type DailyUsd = {
  /** ISO date (YYYY-MM-DD, UTC) inside the current period. */
  date: string;
  /** Costed derived USD for that day. */
  usd: number;
};

export type CumulativePoint = {
  /** Day of the period, 1-based. */
  day: number;
  /** Cumulative display-currency spend through that day. */
  spent: number;
};

/** Endpoints of the expected-pace reference line: the budget distributed
 *  evenly across the period's days, so the eye can spot the day real spend
 *  detached from plan. Presentation-neutral (never semaphore-colored) — pace
 *  is a reference, not a status. Null when there is nothing to distribute. */
export function expectedPaceSegment(
  budget: number | null,
  daysInPeriod: number,
): { start: CumulativePoint; end: CumulativePoint } | null {
  if (budget === null || budget <= 0 || daysInPeriod < 1) return null;
  return {
    start: { day: 1, spent: budget / daysInPeriod },
    end: { day: daysInPeriod, spent: budget },
  };
}

export function buildCumulativeSpend(input: {
  apiByDay: DailyUsd[];
  fxRate: number | null;
  /** Seat cost accrued through today, display currency. */
  seatAccrued: number;
  dayOfPeriod: number;
}): CumulativePoint[] {
  const { apiByDay, fxRate, seatAccrued, dayOfPeriod } = input;
  if (dayOfPeriod <= 0) return [];

  // USD per day-of-month; rows outside 1..today are ignored (defensive — the
  // read path already filters to the current period).
  const usdByDay = new Map<number, number>();
  for (const row of apiByDay) {
    const day = Number(row.date.slice(8, 10));
    if (!Number.isFinite(day) || day < 1 || day > dayOfPeriod) continue;
    usdByDay.set(day, (usdByDay.get(day) ?? 0) + row.usd);
  }

  const seatPerDay = seatAccrued / dayOfPeriod;
  const points: CumulativePoint[] = [];
  let cumUsd = 0;
  for (let day = 1; day <= dayOfPeriod; day++) {
    cumUsd += usdByDay.get(day) ?? 0;
    const api = fxRate === null ? 0 : cumUsd * fxRate;
    points.push({ day, spent: api + seatPerDay * day });
  }
  return points;
}
