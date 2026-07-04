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
};

const MONTH_LABEL = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
});

export function currentPeriod(now: Date = new Date()): Period {
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth(); // 0..11
  // Day 0 of the next month = last day of this month.
  const daysInPeriod = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const dayOfPeriod = now.getUTCDate();
  return {
    dayOfPeriod,
    daysInPeriod,
    monthLabel: MONTH_LABEL.format(now),
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
