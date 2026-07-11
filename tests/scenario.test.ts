import { describe, expect, it } from "vitest";

import {
  breakEvenDelta,
  simulatePace,
  type ScenarioInput,
} from "@/lib/engine/scenario";

// WP3 of the 2026-07-11 audit plan (QA-10 + QA-04): the lever scales only the
// team's REMAINING spend; team and company outcomes are computed separately,
// each against its own budget; the break-even preset targets the TEAM budget.

// Org projects R$ 12.000 against R$ 10.000; the team has a R$ 4.000 budget,
// spent 3.000 and projects 8.000 — so its remaining (leverable) spend is 5.000.
const input: ScenarioInput = {
  org: { budget: 10_000, projection: 12_000 },
  team: { budget: 4_000, spent: 3_000, projection: 8_000 },
};

describe("simulatePace — separate team and company outcomes", () => {
  it("current pace (0) reproduces the engine projections exactly", () => {
    const r = simulatePace(input, 0);
    expect(r.team.close).toBe(8_000);
    expect(r.team.margin).toBe(-4_000);
    expect(r.team.withinBudget).toBe(false);
    expect(r.org.close).toBe(12_000);
    expect(r.org.margin).toBe(-2_000);
    expect(r.org.withinBudget).toBe(false);
  });

  it("a −30% cut scales only the REMAINING spend, never the past", () => {
    const r = simulatePace(input, -0.3);
    // remaining 5.000 × 0.7 = 3.500 → team closes at 6.500
    expect(r.team.close).toBe(6_500);
    // the 1.500 saved flows 1:1 into the org close
    expect(r.org.close).toBe(10_500);
    expect(r.org.margin).toBe(-500);
  });

  it("company under while team over: both stated, neither masks the other (QA-04)", () => {
    // The audit case: −30% put the company inside its budget while the team
    // was still ~300% over its own — the result must say both, separately.
    const r = simulatePace(
      {
        org: { budget: 12_000, projection: 12_500 },
        team: { budget: 1_120, spent: 1_500, projection: 4_798 },
      },
      -0.3,
    );
    expect(r.org.withinBudget).toBe(true);
    expect(r.team.withinBudget).toBe(false);
    expect(r.team.close).toBeGreaterThan(1_120);
  });

  it("company over while team under: the healthy team is not blamed", () => {
    const r = simulatePace(
      {
        org: { budget: 10_000, projection: 12_000 },
        team: { budget: 3_000, spent: 1_000, projection: 2_000 },
      },
      0,
    );
    expect(r.team.withinBudget).toBe(true);
    expect(r.org.withinBudget).toBe(false);
  });

  it("acceleration works symmetrically (+20%)", () => {
    const r = simulatePace(input, 0.2);
    expect(r.team.close).toBe(9_000);
    expect(r.org.close).toBe(13_000);
  });

  it("clamps: a scenario can never unspend money (−100% floor)", () => {
    const r = simulatePace(input, -5);
    expect(r.team.close).toBe(3_000); // spent stays on the books
    expect(r.org.close).toBe(7_000);
    expect(r.org.withinBudget).toBe(true);
  });

  it("a team already past its projection has nothing to lever", () => {
    const r = simulatePace(
      { org: input.org, team: { budget: 4_000, spent: 9_000, projection: 8_000 } },
      -0.5,
    );
    expect(r.team.close).toBe(9_000);
    expect(r.org.close).toBe(12_000);
  });
});

describe("breakEvenDelta — the 'fechar no orçamento' preset (team budget)", () => {
  it("finds the exact cut and simulating it closes the TEAM on its budget", () => {
    const be = breakEvenDelta(input);
    // team gap 4.000 over remaining 5.000 → the team must slow 80%
    expect(be).toEqual({ delta: -0.8, reachable: true });

    const r = simulatePace(input, be.delta as number);
    expect(r.team.close).toBe(4_000);
    expect(r.team.margin).toBe(0);
    expect(r.team.withinBudget).toBe(true);
  });

  it("recalculates even when the COMPANY already closes inside (the QA-10 bug)", () => {
    // Old behavior targeted the org budget: org under → delta 0 → the preset
    // did nothing while the team stayed over its own budget.
    const be = breakEvenDelta({
      org: { budget: 20_000, projection: 12_000 }, // org comfortably under
      team: input.team, // team projecting 8.000 against 4.000
    });
    expect(be.delta).toBe(-0.8);
    expect(be.reachable).toBe(true);
  });

  it("preset and slider agree with no rounding drift on fractional deltas", () => {
    // Chosen so the exact delta is −37,5% — a value a whole-percent slider
    // label would round. The preset must still land ON the budget.
    const fractional: ScenarioInput = {
      org: { budget: 10_000, projection: 12_000 },
      team: { budget: 6_125, spent: 3_000, projection: 8_000 },
    };
    const be = breakEvenDelta(fractional);
    expect(be.delta).toBeCloseTo(-0.375, 10);
    const r = simulatePace(fractional, be.delta as number);
    expect(r.team.close).toBeCloseTo(6_125, 10);
  });

  it("is 0 when the team already projects inside its own budget", () => {
    const be = breakEvenDelta({
      org: input.org,
      team: { budget: 9_000, spent: 3_000, projection: 8_000 },
    });
    expect(be).toEqual({ delta: 0, reachable: true });
  });

  it("discloses when already-spent cost alone exceeds the team budget", () => {
    const be = breakEvenDelta({
      org: input.org,
      team: { budget: 2_000, spent: 3_000, projection: 8_000 }, // spent > budget
    });
    expect(be.reachable).toBe(false);
    expect(be.delta).toBe(-1); // clamped to "team stops entirely"
  });

  it("is null when the team has no remaining spend to lever", () => {
    const be = breakEvenDelta({
      org: input.org,
      team: { budget: 4_000, spent: 8_000, projection: 8_000 },
    });
    expect(be).toEqual({ delta: null, reachable: false });
  });
});
