// Denarius engine — top-driver extraction (pure, no I/O). "What's behind this
// spend?" — teams, people, or models ranked by contribution, each with its
// share of the total, so a finding can say "3 teams = 87%" without the LLM ever
// doing the arithmetic (invariant #2). Generic over what a driver IS: the caller
// passes labeled values (team totals, model totals, …).

export type DriverInput = { label: string; value: number };

export type Driver = {
  label: string;
  value: number;
  /** value ÷ Σ values (0..1), 0 when the total is 0. */
  share: number;
};

/**
 * Top `limit` contributors, descending by value, each with its share of the
 * total. Non-positive contributions are dropped (they aren't drivers of spend).
 * The share denominator is the total across ALL positive inputs, not just the
 * returned top N — so shares stay honest even when the list is truncated.
 */
export function topDrivers(items: DriverInput[], limit = 3): Driver[] {
  const positive = items.filter((i) => i.value > 0);
  const total = positive.reduce((sum, i) => sum + i.value, 0);
  return positive
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((i) => ({
      label: i.label,
      value: i.value,
      share: total > 0 ? i.value / total : 0,
    }));
}
