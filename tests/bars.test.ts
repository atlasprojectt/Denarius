import { describe, expect, it } from "vitest";

import { barGeometry } from "@/lib/bars";

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
