import { describe, expect, it } from "vitest";

import { evaluateBudget } from "@/lib/engine/budget";
import {
  buildBudgetThresholdFinding,
  orderFindings,
} from "@/lib/findings/budget-threshold";
import { CONTROL_CATALOG, controlPlanFor } from "@/lib/findings/catalog";

const period = (dayOfPeriod: number, daysInPeriod = 30) => ({
  dayOfPeriod,
  daysInPeriod,
});

const CATALOG_IDS = new Set<string>(
  Object.values(CONTROL_CATALOG).map((action) => action.id),
);

describe("buildBudgetThresholdFinding", () => {
  it("returns null when no threshold is crossed", () => {
    const finding = buildBudgetThresholdFinding({
      scope: "team",
      targetId: "t1",
      targetName: "Eng",
      evaluation: evaluateBudget({ budget: 1000, spent: 200, period: period(15, 30) }),
      currency: "BRL",
    });
    expect(finding).toBeNull();
  });

  it("carries numbers, top drivers, and a control plan for a breach", () => {
    const finding = buildBudgetThresholdFinding({
      scope: "team",
      targetId: "t1",
      targetName: "Eng",
      evaluation: evaluateBudget({ budget: 500, spent: 600, period: period(15, 30) }),
      driverInputs: [
        { label: "gpt-4o", value: 400 },
        { label: "claude-sonnet", value: 200 },
      ],
      currency: "BRL",
    });
    expect(finding).not.toBeNull();
    expect(finding!.level).toBe("breach");
    expect(finding!.numbers.spent).toBe(600);
    expect(finding!.overrun).toBe(100); // 600 − 500
    expect(finding!.drivers[0].label).toBe("gpt-4o");
    expect(finding!.controlPlan.length).toBeGreaterThan(0);
  });

  it("NEVER invents control actions — every one comes from the catalog", () => {
    for (const level of ["warning", "projected_breach", "breach"] as const) {
      for (const action of controlPlanFor(level)) {
        expect(CATALOG_IDS.has(action.id)).toBe(true);
      }
    }
  });
});

describe("orderFindings — by budget impact (story 34)", () => {
  it("most severe first, then by size of overrun", () => {
    const warn = buildBudgetThresholdFinding({
      scope: "team",
      targetId: "w",
      targetName: "Warn",
      // day 29, spent 850 → projection < budget, pct 0.85 → warning only.
      evaluation: evaluateBudget({ budget: 1000, spent: 850, period: period(29, 30) }),
      currency: "BRL",
    })!;
    const smallBreach = buildBudgetThresholdFinding({
      scope: "team",
      targetId: "b1",
      targetName: "SmallBreach",
      evaluation: evaluateBudget({ budget: 500, spent: 550, period: period(20, 30) }),
      currency: "BRL",
    })!;
    const bigBreach = buildBudgetThresholdFinding({
      scope: "team",
      targetId: "b2",
      targetName: "BigBreach",
      evaluation: evaluateBudget({ budget: 500, spent: 900, period: period(20, 30) }),
      currency: "BRL",
    })!;

    const ordered = orderFindings([warn, smallBreach, bigBreach]);
    expect(ordered.map((f) => f.targetName)).toEqual([
      "BigBreach", // breach, overrun 400
      "SmallBreach", // breach, overrun 50
      "Warn", // warning
    ]);
  });
});
