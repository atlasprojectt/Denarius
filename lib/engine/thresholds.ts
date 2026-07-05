// Denarius engine — budget threshold crossings, severity ordering, and the
// notification dedup rule (pure, no I/O). A crossing is what turns a budget
// evaluation into a finding + (eventually, #20) an alert.

import type { BudgetEvaluation } from "./budget";

// Three named levels, by increasing severity:
//   warning          — spent reached a configured sub-100% threshold (default 80%)
//   projected_breach — run-rate projects a close over budget (day-5 guard passed)
//   breach           — spent already met/passed the budget (the realized overrun)
//
// PRD P11 lists the escalation ladder as "80% → 100% → projected-breach". We
// deliberately rank a REALIZED breach (100%) above a mere projection: a verdict
// goes RED only when spend has actually crossed the line (amber = projected).
// Ranking projected_breach above breach would let a softer, forward-looking
// signal outrank the hard fact — inconsistent with the verdict model. Escalation
// stays monotonic under this order. (Flagged for founder confirmation in the PR.)
export type ThresholdLevel = "warning" | "projected_breach" | "breach";

const RANK: Record<ThresholdLevel, number> = {
  warning: 1,
  projected_breach: 2,
  breach: 3,
};

export function severityRank(level: ThresholdLevel): number {
  return RANK[level];
}

/** Highest configured sub-100% threshold that `pctSpent` has reached, or null. */
function warnThresholdCrossed(
  pctSpent: number,
  thresholds: number[],
): boolean {
  const warns = thresholds.filter((t) => t > 0 && t < 1);
  const highest = warns.length > 0 ? Math.max(...warns) : 0.8;
  return pctSpent >= highest;
}

/**
 * Levels currently active for one budget evaluation, ascending by severity.
 * A realized breach is terminal — it subsumes the warning and projection (both
 * are trivially true once over budget), so `['breach']` is returned alone.
 */
export function activeLevels(
  evaluation: BudgetEvaluation,
  thresholds: number[] = [0.8, 1.0],
): ThresholdLevel[] {
  if (evaluation.breached) return ["breach"];

  const levels: ThresholdLevel[] = [];
  if (warnThresholdCrossed(evaluation.pctSpent, thresholds)) {
    levels.push("warning");
  }
  if (evaluation.projectedBreach) levels.push("projected_breach");
  return levels.sort((a, b) => RANK[a] - RANK[b]);
}

/** The single most severe active level, or null when nothing is crossed. */
export function highestLevel(levels: ThresholdLevel[]): ThresholdLevel | null {
  if (levels.length === 0) return null;
  return levels.reduce((max, l) => (RANK[l] > RANK[max] ? l : max));
}

/**
 * The dedup rule behind "fire once per (team, level, period)" (PRD P11).
 * Given the levels active now and the levels already sent this period, return
 * only the levels that should fire: those strictly MORE severe than anything
 * already sent. A re-crossed same level never re-fires (its rank isn't higher);
 * escalation to a higher level does. Because it keys off the highest sent rank,
 * mid-period budget edits that re-trip a lower level stay silent — the
 * notification_log is never reset by an edit (invariant #6).
 */
export function notificationsToFire(
  currentLevels: ThresholdLevel[],
  alreadySent: ThresholdLevel[],
): ThresholdLevel[] {
  const sentRank = alreadySent.reduce((max, l) => Math.max(max, RANK[l]), 0);
  return currentLevels
    .filter((l) => RANK[l] > sentRank)
    .sort((a, b) => RANK[a] - RANK[b]);
}
