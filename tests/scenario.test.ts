import { describe, expect, it } from "vitest";

import {
  breakEvenDelta,
  simulatePace,
  type ScenarioInput,
} from "@/lib/engine/scenario";

// Org projects R$ 12.000 against R$ 10.000; the team spent 3.000 and projects
// 8.000 — so its remaining (leverable) spend is 5.000.
const input: ScenarioInput = {
  org: { budget: 10_000, projection: 12_000 },
  team: { spent: 3_000, projection: 8_000 },
};

describe("simulatePace", () => {
  it("current pace (0) reproduces the engine projections exactly", () => {
    const r = simulatePace(input, 0);
    expect(r.teamClose).toBe(8_000);
    expect(r.orgClose).toBe(12_000);
    expect(r.orgMargin).toBe(-2_000);
    expect(r.withinBudget).toBe(false);
  });

  it("a −30% cut scales only the REMAINING spend, never the past", () => {
    const r = simulatePace(input, -0.3);
    // remaining 5.000 × 0.7 = 3.500 → team closes at 6.500
    expect(r.teamClose).toBe(6_500);
    // the 1.500 saved flows 1:1 into the org close
    expect(r.orgClose).toBe(10_500);
    expect(r.orgMargin).toBe(-500);
  });

  it("acceleration works symmetrically (+20%)", () => {
    const r = simulatePace(input, 0.2);
    expect(r.teamClose).toBe(9_000);
    expect(r.orgClose).toBe(13_000);
  });

  it("clamps: a scenario can never unspend money (−100% floor)", () => {
    const r = simulatePace(input, -5);
    expect(r.teamClose).toBe(3_000); // spent stays on the books
    expect(r.orgClose).toBe(7_000);
    expect(r.withinBudget).toBe(true);
  });

  it("a team already past its projection has nothing to lever", () => {
    const r = simulatePace(
      { org: input.org, team: { spent: 9_000, projection: 8_000 } },
      -0.5,
    );
    expect(r.teamClose).toBe(9_000);
    expect(r.orgClose).toBe(12_000);
  });
});

describe("breakEvenDelta — the 'fechar no orçamento' preset", () => {
  it("finds the exact cut and simulating it closes the org ON budget", () => {
    const be = breakEvenDelta(input);
    // gap 2.000 over remaining 5.000 → the team must slow 40%
    expect(be).toEqual({ delta: -0.4, reachable: true });

    const r = simulatePace(input, be.delta as number);
    expect(r.orgClose).toBe(10_000);
    expect(r.orgMargin).toBe(0);
    expect(r.withinBudget).toBe(true);
  });

  it("is 0 when the org already closes within budget", () => {
    const be = breakEvenDelta({
      org: { budget: 13_000, projection: 12_000 },
      team: input.team,
    });
    expect(be).toEqual({ delta: 0, reachable: true });
  });

  it("discloses when even stopping the team doesn't close the gap", () => {
    const be = breakEvenDelta({
      org: { budget: 10_000, projection: 16_000 }, // gap 6.000 > remaining 5.000
      team: input.team,
    });
    expect(be.reachable).toBe(false);
    expect(be.delta).toBe(-1); // clamped to "team stops entirely"
  });

  it("is null when the team has no remaining spend to lever", () => {
    const be = breakEvenDelta({
      org: input.org,
      team: { spent: 8_000, projection: 8_000 },
    });
    expect(be).toEqual({ delta: null, reachable: false });
  });
});
