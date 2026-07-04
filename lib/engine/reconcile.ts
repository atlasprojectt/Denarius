// Denarius engine — reconciliation of derived cost vs provider-reported cost
// (pure, no I/O). Invariant #3: spend never silently disappears; when our
// tokens×price derivation drifts from what the provider bills at the shared
// grain, we DISCLOSE the gap rather than trusting either blindly. cost_report /
// Costs API remains the headline truth; this measures how far our derivation is
// from it, so a data-quality notice can fire when the gap is real.

export type Reconciliation = {
  /** Σ derived cost (tokens × price), costed models only, USD. */
  derivedUsd: number;
  /** Σ provider-reported cost at the shared grain (cost_daily), USD. */
  reportedUsd: number;
  /** reported − derived. Positive = provider bills more than we derived. */
  driftUsd: number;
  /** |drift| ÷ reported, or null when reported is 0 (nothing to compare against). */
  driftPct: number | null;
  /** True when the gap is small enough to treat the numbers as agreeing. */
  withinTolerance: boolean;
};

export type ReconcileOptions = {
  /** Relative gap allowed before a notice fires. Default 5%. */
  tolerancePct?: number;
  /** Absolute gap always tolerated, so tiny reported totals don't trip on
   *  rounding/percentage math. Default $0.50. */
  floorUsd?: number;
};

/**
 * Compares derived vs reported spend. A gap within max(floor, tolerance×reported)
 * is treated as agreement. Note: uncosted models legitimately make derived <
 * reported — the caller decides whether an out-of-tolerance drift reads as
 * "explained by uncosted models" or a genuine data-quality drift.
 */
export function reconcile(
  derivedUsd: number,
  reportedUsd: number,
  options: ReconcileOptions = {},
): Reconciliation {
  const tolerancePct = options.tolerancePct ?? 0.05;
  const floorUsd = options.floorUsd ?? 0.5;

  const driftUsd = reportedUsd - derivedUsd;
  const absDrift = Math.abs(driftUsd);
  const allowed = Math.max(floorUsd, tolerancePct * Math.abs(reportedUsd));
  const driftPct = reportedUsd === 0 ? null : absDrift / Math.abs(reportedUsd);

  return {
    derivedUsd,
    reportedUsd,
    driftUsd,
    driftPct,
    withinTolerance: absDrift <= allowed,
  };
}
