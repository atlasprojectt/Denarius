import { describe, expect, it } from "vitest";

import { buildMonthlyPace } from "@/lib/engine/monthly-pace";

// The Home pace series is one row per day of the period. It must mirror the
// evaluation combine exactly (the last realized point IS spent-to-date), spread
// the projection linearly to the close, expose the per-day bars as first
// differences of the cumulative, and mark the budget crossing — all without the
// realized region ever turning red.

const base = {
  apiByDay: [],
  fxRate: 1,
  seatAccrued: 0,
  budget: 3100,
  projection: null as number | null,
  dayOfPeriod: 10,
  daysInPeriod: 31,
};

describe("buildMonthlyPace", () => {
  it("emits one row per day of the period", () => {
    const pace = buildMonthlyPace({ ...base, apiByDay: [{ date: "2026-07-01", usd: 100 }] });
    expect(pace.rows).toHaveLength(31);
    expect(pace.rows[0].day).toBe(1);
    expect(pace.rows.at(-1)?.day).toBe(31);
  });

  it("lands the last realized point exactly on spent-to-date", () => {
    const pace = buildMonthlyPace({
      ...base,
      apiByDay: [{ date: "2026-07-02", usd: 3 }, { date: "2026-07-05", usd: 7 }],
      fxRate: 5,
      seatAccrued: 45,
      dayOfPeriod: 5,
    });
    expect(pace.todayValue).toBe(95);
    expect(pace.rows[4].realized).toBe(95); // day 5
    expect(pace.rows[4].projected).toBeNull(); // no projection while collecting
  });

  it("nulls realized and daily for future days, keeps them for past days", () => {
    const pace = buildMonthlyPace({
      ...base,
      apiByDay: [{ date: "2026-07-01", usd: 10 }, { date: "2026-07-03", usd: 5 }],
      fxRate: 2,
      dayOfPeriod: 4,
    });
    // cumulative 20, 20, 30, 30 → daily 20, 0, 10, 0
    expect(pace.rows.slice(0, 4).map((r) => r.realized)).toEqual([20, 20, 30, 30]);
    expect(pace.rows.slice(0, 4).map((r) => r.daily)).toEqual([20, 0, 10, 0]);
    expect(pace.rows[4].realized).toBeNull();
    expect(pace.rows[4].daily).toBeNull();
  });

  it("runs the projection tail from today to the close, sharing the vertex", () => {
    const pace = buildMonthlyPace({
      ...base,
      apiByDay: [{ date: "2026-07-10", usd: 1000 }],
      projection: 3100,
      dayOfPeriod: 10,
      budget: 4000,
    });
    expect(pace.rows[9].projected).toBe(1000); // day 10 == today == spent (shared vertex)
    expect(pace.rows[9].realized).toBe(1000); // no visual duplication
    expect(pace.rows.at(-1)?.projected).toBeCloseTo(3100); // day 31 == projection
    // before today there is no projection
    expect(pace.rows[8].projected).toBeNull();
  });

  it("computes the expected-pace line as the budget spread evenly", () => {
    const pace = buildMonthlyPace({ ...base, apiByDay: [{ date: "2026-07-01", usd: 100 }] });
    expect(pace.rows[0].pace).toBeCloseTo(100); // 3100 / 31 × 1
    expect(pace.rows.at(-1)?.pace).toBeCloseTo(3100);
    expect(pace.paceToday).toBeCloseTo(1000); // day 10
  });

  it("null pace when there is no positive budget", () => {
    const pace = buildMonthlyPace({ ...base, budget: 0, apiByDay: [{ date: "2026-07-01", usd: 100 }] });
    expect(pace.rows.every((r) => r.pace === null)).toBe(true);
    expect(pace.paceToday).toBeNull();
  });

  it("sets the overrun band only on projected days above budget, never realized", () => {
    const pace = buildMonthlyPace({
      ...base,
      budget: 2000,
      apiByDay: [{ date: "2026-07-10", usd: 1000 }],
      projection: 3100,
      dayOfPeriod: 10,
    });
    // realized region: no overrun anywhere
    expect(pace.rows.slice(0, 10).every((r) => r.overrun === null)).toBe(true);
    // the tail must have some overrun once it clears 2000, and each overrun row
    // is itself above budget
    const overrunRows = pace.rows.filter((r) => r.overrun !== null);
    expect(overrunRows.length).toBeGreaterThan(0);
    expect(overrunRows.every((r) => (r.overrun as number) > 2000)).toBe(true);
    // the close is above budget → last row is an overrun row
    expect(pace.rows.at(-1)?.overrun).toBeCloseTo(3100);
  });

  it("interpolates the crossing day when under budget today but projected to breach", () => {
    const pace = buildMonthlyPace({
      ...base,
      budget: 2000,
      apiByDay: [{ date: "2026-07-10", usd: 1000 }],
      projection: 3100,
      dayOfPeriod: 10,
      daysInPeriod: 31,
    });
    // day = 10 + (2000-1000)/(3100-1000) × (31-10) = 10 + (1000/2100)×21 = 20
    expect(pace.crossing?.day).toBeCloseTo(20);
  });

  it("has no crossing while collecting, when already breached, or when the projection stays under budget", () => {
    const collecting = buildMonthlyPace({ ...base, apiByDay: [{ date: "2026-07-01", usd: 100 }] });
    expect(collecting.crossing).toBeNull();

    const alreadyBreached = buildMonthlyPace({
      ...base,
      budget: 500,
      apiByDay: [{ date: "2026-07-10", usd: 800 }],
      projection: 2400,
      dayOfPeriod: 10,
    });
    expect(alreadyBreached.crossing).toBeNull();

    const underBudget = buildMonthlyPace({
      ...base,
      budget: 5000,
      apiByDay: [{ date: "2026-07-10", usd: 1000 }],
      projection: 3100,
      dayOfPeriod: 10,
    });
    expect(underBudget.crossing).toBeNull();
    expect(underBudget.rows.every((r) => r.overrun === null)).toBe(true);
  });

  it("drops API entirely when FX is missing — realized is seats-only", () => {
    const pace = buildMonthlyPace({
      ...base,
      apiByDay: [{ date: "2026-07-01", usd: 100 }],
      fxRate: null,
      seatAccrued: 20,
      dayOfPeriod: 2,
    });
    expect(pace.rows.slice(0, 2).map((r) => r.realized)).toEqual([10, 20]);
    expect(pace.todayValue).toBe(20);
  });

  it("returns empty realized rows before day 1", () => {
    const pace = buildMonthlyPace({ ...base, dayOfPeriod: 0 });
    expect(pace.todayValue).toBe(0);
    expect(pace.rows.slice(0, 5).every((r) => r.realized === null)).toBe(true);
  });
});
