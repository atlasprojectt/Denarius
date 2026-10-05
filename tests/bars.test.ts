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

describe("pacingSegments — the hero bar's colors", () => {
  const width = (span: { from: number; to: number } | null) =>
    span === null ? 0 : span.to - span.from;

  it("under budget: spent, the projection inside the budget, then leftover", () => {
    const s = pacingSegments(0.22, 0.71);
    expect(s.spent).toEqual({ from: 0, to: 0.22 });
    expect(s.overspent).toBeNull();
    expect(s.projected?.from).toBeCloseTo(0.22);
    expect(s.projected?.to).toBeCloseTo(0.71);
    expect(s.projectedOver).toBeNull();
    expect(s.leftover?.from).toBeCloseTo(0.71);
    expect(s.leftover?.to).toBe(1);
  });

  it("projected overrun: the projection runs to the limit and the overrun follows", () => {
    // Track scales to the projection: the limit lands at 1/1.35.
    const s = pacingSegments(0.48, 1.35);
    expect(s.projected?.from).toBeCloseTo(0.48 / 1.35);
    expect(s.projected?.to).toBeCloseTo(1 / 1.35);
    expect(s.projectedOver?.from).toBeCloseTo(1 / 1.35);
    expect(s.projectedOver?.to).toBeCloseTo(1);
    expect(s.overspent).toBeNull();
    expect(s.leftover).toBeNull();
  });

  it("realized breach: the spend stops at the limit and the overrun is split into done and to come", () => {
    const s = pacingSegments(1.31, 1.9);
    expect(s.spent.to).toBeCloseTo(1 / 1.9);
    expect(s.overspent?.from).toBeCloseTo(1 / 1.9);
    expect(s.overspent?.to).toBeCloseTo(1.31 / 1.9);
    expect(s.projected).toBeNull();
    expect(s.projectedOver?.from).toBeCloseTo(1.31 / 1.9);
    expect(s.projectedOver?.to).toBeCloseTo(1);
    expect(s.leftover).toBeNull();
  });

  it("before the day-5 guard: nothing is projected, the rest of the budget is free", () => {
    const s = pacingSegments(0.08, null);
    expect(s.projected).toBeNull();
    expect(s.projectedOver).toBeNull();
    expect(s.leftover?.from).toBeCloseTo(0.08);
    expect(s.leftover?.to).toBe(1);
  });

  it("never paints overrun and leftover together, and always tiles the track", () => {
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
      const overrun = s.overspent !== null || s.projectedOver !== null;
      expect(overrun && s.leftover !== null).toBe(false);
      const total =
        width(s.spent) +
        width(s.overspent) +
        width(s.projected) +
        width(s.projectedOver) +
        width(s.leftover);
      expect(total).toBeCloseTo(1);
    }
  });
});
