// Denarius engine — billing period math (pure, no I/O).
// A period is the calendar month, computed in UTC so it is deterministic and
// testable regardless of the server timezone.

export type Period = {
  /** Elapsed days including today, 1..daysInPeriod. */
  dayOfPeriod: number;
  /** Total days in the calendar month. */
  daysInPeriod: number;
  /** pt-BR month name, e.g. "julho". */
  monthLabel: string;
  /** Calendar year, UTC. */
  year: number;
  /** Calendar month, 1..12, UTC. */
  month: number;
  /** First day of the month, yyyy-mm-dd — THE period key (budget.period_month,
   *  period_snapshot.period_month). */
  monthStart: string;
};

const MONTH_LABEL = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
});

/** Total days in a calendar month (day 0 of the next month = its last day). */
function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isoDay(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

/** pt-BR month name for a year/month pair, e.g. "julho". */
export function monthLabelOf(year: number, month: number): string {
  return MONTH_LABEL.format(new Date(Date.UTC(year, month - 1, 1)));
}

export function currentPeriod(now: Date = new Date()): Period {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1..12
  return {
    dayOfPeriod: now.getUTCDate(),
    daysInPeriod: daysIn(year, month),
    monthLabel: MONTH_LABEL.format(now),
    year,
    month,
    monthStart: isoDay(year, month, 1),
  };
}

/**
 * A CLOSED month as a period: fully elapsed, so `dayOfPeriod === daysInPeriod`.
 * The engine is period-agnostic — feeding it a closed period makes the run-rate
 * projection land on the realized total, which is what a frozen month means
 * (#94). Never call this for a month that is still running.
 */
export function closedPeriod(year: number, month: number): Period {
  const daysInPeriod = daysIn(year, month);
  return {
    dayOfPeriod: daysInPeriod,
    daysInPeriod,
    monthLabel: monthLabelOf(year, month),
    year,
    month,
    monthStart: isoDay(year, month, 1),
  };
}

/** The calendar month before `now`, UTC (December rolls the year back). */
export function previousMonthOf(now: Date = new Date()): {
  year: number;
  month: number;
} {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/**
 * A whole calendar month as a half-open date window, yyyy-mm-dd. `nextStart` is
 * EXCLUSIVE: closed-month reads must bound both ends (`.gte(start).lt(nextStart)`),
 * unlike the current-month reads that lean on "no future rows exist".
 */
export function monthRange(
  year: number,
  month: number,
): { start: string; nextStart: string } {
  return {
    start: isoDay(year, month, 1),
    nextStart: isoDay(year, month, daysIn(year, month) + 1),
  };
}

/** First day of the calendar month, UTC, as yyyy-mm-dd. */
export function monthStartUtc(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

/**
 * Month-to-date window in unix seconds (UTC), end exclusive at `now` —
 * the "we found $X this month" sync window.
 */
export function monthToDateRange(now: Date = new Date()): {
  startTime: number;
  endTime: number;
} {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  return {
    startTime: Math.floor(start / 1000),
    endTime: Math.floor(now.getTime() / 1000),
  };
}
