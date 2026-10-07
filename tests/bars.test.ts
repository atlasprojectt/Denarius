import { describe, expect, it } from "vitest";

import { barGeometry, pacingSegments } from "@/lib/bars";

describe("barGeometry — budget bar positioning", () => {
  it("under budget: marker at the end, fill proportional, no ghost", () => {
    const g = barGeometry(0.5, null);
    expect(g.marker).toBe(1);
    expect(g.fill).toBe(0.5);
    expect(g.ghostStart).toBeNull();
    expect(g.ghostEnd).toBeNull();
  });

  it("projection past spend but under budget: ghost from fill to projection", () => {
    const g = barGeometry(0.5, 0.8);
    expect(g.marker).toBe(1);
    expect(g.fill).toBe(0.5);
    expect(g.ghostStart).toBe(0.5);
    expect(g.ghostEnd).toBeCloseTo(0.8);
  });

  it("no ghost when projection does not exceed spend", () => {
    const g = barGeometry(0.8, 0.6);
    expect(g.ghostStart).toBeNull();
    expect(g.ghostEnd).toBeNull();
  });

  it("breach: track scales to spend, marker slides left below 1", () => {
    const g = barGeometry(1.5, null);
    expect(g.fill).toBeCloseTo(1);
    expect(g.marker).toBeCloseTo(1 / 1.5);
    expect(g.marker).toBeLessThan(1);
  });

  it("projected overrun scales the track to the projection", () => {
    const g = barGeometry(0.9, 2);
    // scale = 2 → marker at 0.5, fill 0.45, ghost 0.45..1.0.
    expect(g.marker).toBeCloseTo(0.5);
    expect(g.fill).toBeCloseTo(0.45);
    expect(g.ghostStart).toBeCloseTo(0.45);
    expect(g.ghostEnd).toBeCloseTo(1);
  });

  it("clamps negative inputs to zero", () => {
    const g = barGeometry(-0.3, null);
    expect(g.fill).toBe(0);
    expect(g.marker).toBe(1);
  });
});

describe("pacingSegments — layered pacing bar, shorter layer in front", () => {
  const width = (span: { from: number; to: number } | null) =>
    span === null ? 0 : span.to - span.from;

  it("close fits the budget: spent, then the projection in front of the budget's tail", () => {
    const s = pacingSegments(0.22, 0.71);
    expect(s.spent).toEqual({ from: 0, to: 0.22 });
    expect(s.overspent).toBeNull();
    expect(s.projectionOver).toBe(false);
    expect(s.projected?.from).toBeCloseTo(0.22);
    expect(s.projected?.to).toBeCloseTo(0.71);
    expect(s.budget?.from).toBeCloseTo(0.71);
    expect(s.budget?.to).toBe(1);
  });

  it("close passes the budget: the budget comes forward and the projection shows past it", () => {
    // Track scales to the projection: the limit lands at 1/1.35.
    const s = pacingSegments(0.48, 1.35);
    expect(s.projectionOver).toBe(true);
    expect(s.budget?.from).toBeCloseTo(0.48 / 1.35);
    expect(s.budget?.to).toBeCloseTo(1 / 1.35);
    expect(s.projected?.from).toBeCloseTo(1 / 1.35);
    expect(s.projected?.to).toBeCloseTo(1);
    expect(s.overspent).toBeNull();
  });

  it("realized breach: the spend covers the budget, its overrun follows, then the projection", () => {
    const s = pacingSegments(1.31, 1.9);
    expect(s.spent.to).toBeCloseTo(1 / 1.9);
    expect(s.overspent?.from).toBeCloseTo(1 / 1.9);
    expect(s.overspent?.to).toBeCloseTo(1.31 / 1.9);
    expect(s.budget).toBeNull();
    expect(s.projectionOver).toBe(true);
    expect(s.projected?.from).toBeCloseTo(1.31 / 1.9);
    expect(s.projected?.to).toBeCloseTo(1);
  });

  it("before the day-5 guard: no projection layer, the budget follows the spend", () => {
    const s = pacingSegments(0.08, null);
    expect(s.projected).toBeNull();
    expect(s.projectionOver).toBe(false);
    expect(s.budget?.from).toBeCloseTo(0.08);
    expect(s.budget?.to).toBe(1);
  });

  it("always tiles the track without overlap", () => {
    for (const [spent, projected] of [
      [0.22, 0.71],
      [0.48, 1.35],
      [1.31, 1.9],
      [0.08, null],
      [1.2, null],
      [1, 1],
      [0, 0],
    ] as const) {
      const s = pacingSegments(spent, projected);
      const total =
        width(s.spent) + width(s.overspent) + width(s.projected) + width(s.budget);
      expect(total).toBeCloseTo(1);
    }
  });
});
