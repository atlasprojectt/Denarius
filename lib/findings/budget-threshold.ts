// Denarius — budget_threshold finding builder (pure, no I/O). A crossing on a
// budget evaluation becomes a stateless `finding` (no user-facing status,
// invariant #6) carrying: the numbers, the top drivers, and a control plan
// drawn only from the curated catalog. This is what the home surfaces as a
// "needs attention" row and what #20 renders into an alert.

import type { BudgetEvaluation } from "@/lib/engine/budget";
import { topDrivers, type Driver, type DriverInput } from "@/lib/engine/drivers";
import {
  activeLevels,
  highestLevel,
  severityRank,
  type ThresholdLevel,
} from "@/lib/engine/thresholds";
import { controlPlanFor, type ControlAction } from "./catalog";

export type BudgetThresholdFinding = {
  type: "budget_threshold";
  scope: "org" | "team";
  /** team id for a team finding, null for the org. */
  targetId: string | null;
  targetName: string;
  level: ThresholdLevel;
  severityRank: number;
  numbers: {
    budget: number;
    spent: number;
    projection: number | null;
    currentMargin: number;
    projectedMargin: number | null;
    pctSpent: number;
  };
  /** How much over budget this finding is (realized or projected), ≥ 0 — the
   *  "size of overrun" the PRD orders alerts by. */
  overrun: number;
  drivers: Driver[];
  controlPlan: ControlAction[];
  currency: string;
};

export type BudgetThresholdInput = {
  scope: "org" | "team";
  targetId: string | null;
  targetName: string;
  evaluation: BudgetEvaluation;
  thresholds?: number[];
  /** spend contributors (teams / models / people) for the top-driver extraction. */
  driverInputs?: DriverInput[];
  currency: string;
};

/** The overrun a level represents: realized for a breach, projected otherwise. */
function overrunFor(level: ThresholdLevel, ev: BudgetEvaluation): number {
  if (level === "breach") return Math.max(0, ev.spent - ev.budget);
  if (level === "projected_breach" && ev.projection !== null) {
    return Math.max(0, ev.projection - ev.budget);
  }
  // warning: distance already spent past the 80%-style line, expressed vs budget.
  return Math.max(0, ev.spent - ev.budget);
}

/**
 * Builds the finding for the most severe active level, or null when nothing is
 * crossed. One finding per scope carries the top (highest-severity) crossing;
 * the control plan and drivers describe how to act on it.
 */
export function buildBudgetThresholdFinding(
  input: BudgetThresholdInput,
): BudgetThresholdFinding | null {
  const levels = activeLevels(input.evaluation, input.thresholds);
  const level = highestLevel(levels);
  if (level === null) return null;

  const ev = input.evaluation;
  return {
    type: "budget_threshold",
    scope: input.scope,
    targetId: input.targetId,
    targetName: input.targetName,
    level,
    severityRank: severityRank(level),
    numbers: {
      budget: ev.budget,
      spent: ev.spent,
      projection: ev.projection,
      currentMargin: ev.currentMargin,
      projectedMargin: ev.projectedMargin,
      pctSpent: ev.pctSpent,
    },
    overrun: overrunFor(level, ev),
    drivers: topDrivers(input.driverInputs ?? []),
    controlPlan: controlPlanFor(level),
    currency: input.currency,
  };
}

/**
 * Orders findings by budget impact (PRD story 34): most severe first, then by
 * size of overrun. So the biggest realized breach leads, and a $4k projected
 * overrun outranks a $200 one at the same level.
 */
export function orderFindings(
  findings: BudgetThresholdFinding[],
): BudgetThresholdFinding[] {
  return findings
    .slice()
    .sort(
      (a, b) => b.severityRank - a.severityRank || b.overrun - a.overrun,
    );
}
