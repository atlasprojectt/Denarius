import { describe, expect, it } from "vitest";

import { reconcile } from "@/lib/engine/reconcile";

describe("reconcile — derived vs provider-reported cost", () => {
  it("agrees when derived matches reported within tolerance", () => {
    const r = reconcile(98, 100); // 2% gap, default 5% tolerance
    expect(r.withinTolerance).toBe(true);
    expect(r.driftUsd).toBe(2);
    expect(r.driftPct).toBeCloseTo(0.02);
  });

  it("flags a real drift beyond tolerance", () => {
    const r = reconcile(70, 100); // 30% gap
    expect(r.withinTolerance).toBe(false);
    expect(r.driftUsd).toBe(30);
    expect(r.driftPct).toBeCloseTo(0.3);
  });

  it("drift is signed: reported − derived (positive = provider bills more)", () => {
    expect(reconcile(120, 100).driftUsd).toBe(-20);
    expect(reconcile(80, 100).driftUsd).toBe(20);
  });

  it("tolerates tiny absolute gaps even at large relative percentages", () => {
    // reported $0.10, derived $0 → 100% relative gap but only $0.10 absolute.
    const r = reconcile(0, 0.1);
    expect(r.withinTolerance).toBe(true);
    expect(r.driftPct).toBeCloseTo(1);
  });

  it("returns null driftPct when there is nothing reported to compare against", () => {
    const r = reconcile(0, 0);
    expect(r.driftPct).toBeNull();
    expect(r.withinTolerance).toBe(true);
  });

  it("derived-only spend with no reported cost stays within the absolute floor", () => {
    // Provider reported nothing yet but we derived $0.40 — under the $0.50 floor.
    const r = reconcile(0.4, 0);
    expect(r.driftUsd).toBe(-0.4);
    expect(r.withinTolerance).toBe(true);
  });

  it("honors a custom tolerance and floor", () => {
    // 10% gap: out of tolerance at default 5%, in tolerance at 15%.
    expect(reconcile(90, 100).withinTolerance).toBe(false);
    expect(reconcile(90, 100, { tolerancePct: 0.15 }).withinTolerance).toBe(true);
    // A $5 floor swallows a $4 gap on a small reported total.
    expect(reconcile(6, 10, { floorUsd: 5 }).withinTolerance).toBe(true);
  });
});
