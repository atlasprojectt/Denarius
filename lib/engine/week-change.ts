// Denarius engine — week-over-week API spend change (pure, no I/O). The
// digest's "change" figure: provider-reported cost of the last 7 days vs the
// 7 days before. A percentage of USD sums, so it needs no FX conversion.
// Deltas are NEUTRAL (product principle #5): spending more isn't a warning.

export type DailyCost = { date: string; amount: number };

export type WeekChange = {
  currentUsd: number;
  previousUsd: number;
  /** current/previous − 1, or null when the previous week has no spend
   *  (a ratio against zero would be a guess, not a number). */
  pct: number | null;
};

function isoDaysAgo(now: Date, days: number): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

/** Sums [now−7d, now) vs [now−14d, now−7d), by ISO date (UTC). */
export function weekOverWeek(rows: DailyCost[], now: Date = new Date()): WeekChange {
  const weekAgo = isoDaysAgo(now, 7);
  const twoWeeksAgo = isoDaysAgo(now, 14);
  const today = now.toISOString().slice(0, 10);

  let currentUsd = 0;
  let previousUsd = 0;
  for (const row of rows) {
    if (row.date >= weekAgo && row.date < today) currentUsd += row.amount;
    else if (row.date >= twoWeeksAgo && row.date < weekAgo) previousUsd += row.amount;
  }

  return {
    currentUsd,
    previousUsd,
    pct: previousUsd > 0 ? currentUsd / previousUsd - 1 : null,
  };
}
