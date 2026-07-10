import { describe, expect, it } from "vitest";

import { buildCumulativeSpend } from "@/lib/engine/cumulative";

// The drill-down cumulative series must mirror the evaluation combine exactly:
// frozen-FX conversion, API dropped when FX is missing, seats spread evenly.
// The last point IS the spent-to-date — chart and numbers can never disagree.

describe("buildCumulativeSpend", () => {
  it("accumulates API days with carry-forward over gaps", () => {
    const points = buildCumulativeSpend({
      apiByDay: [
        { date: "2026-07-01", usd: 10 },
        { date: "2026-07-03", usd: 5 },
      ],
      fxRate: 2,
      seatAccrued: 0,
      dayOfPeriod: 4,
    });
    expect(points.map((p) => p.spent)).toEqual([20, 20, 30, 30]);
  });

  it("spreads the accrued seat cost evenly across elapsed days", () => {
    const points = buildCumulativeSpend({
      apiByDay: [],
      fxRate: null,
      seatAccrued: 90,
      dayOfPeriod: 3,
    });
    expect(points.map((p) => p.spent)).toEqual([30, 60, 90]);
  });

  it("excludes API entirely when the FX rate is missing (disclosed, never guessed)", () => {
    const points = buildCumulativeSpend({
      apiByDay: [{ date: "2026-07-01", usd: 100 }],
      fxRate: null,
      seatAccrued: 10,
      dayOfPeriod: 2,
    });
    expect(points.map((p) => p.spent)).toEqual([5, 10]);
  });

  it("lands the final point exactly on spent-to-date (seats + Σusd × fx)", () => {
    const points = buildCumulativeSpend({
      apiByDay: [
        { date: "2026-07-02", usd: 3 },
        { date: "2026-07-05", usd: 7 },
      ],
      fxRate: 5,
      seatAccrued: 45,
      dayOfPeriod: 5,
    });
    expect(points.at(-1)).toEqual({ day: 5, spent: 10 * 5 + 45 });
  });

  it("is monotonically non-decreasing (spend is never unspent)", () => {
    const points = buildCumulativeSpend({
      apiByDay: [
        { date: "2026-07-01", usd: 1 },
        { date: "2026-07-04", usd: 2 },
      ],
      fxRate: 1,
      seatAccrued: 12,
      dayOfPeriod: 6,
    });
    for (let i = 1; i < points.length; i++) {
      expect(points[i].spent).toBeGreaterThanOrEqual(points[i - 1].spent);
    }
  });

  it("ignores rows outside 1..today and returns [] before day 1", () => {
    expect(
      buildCumulativeSpend({
        apiByDay: [{ date: "2026-07-09", usd: 99 }],
        fxRate: 1,
        seatAccrued: 0,
        dayOfPeriod: 2,
      }).map((p) => p.spent),
    ).toEqual([0, 0]);
    expect(
      buildCumulativeSpend({
        apiByDay: [],
        fxRate: 1,
        seatAccrued: 0,
        dayOfPeriod: 0,
      }),
    ).toEqual([]);
  });
});
