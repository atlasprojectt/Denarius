import { describe, expect, it } from "vitest";

import { seatAccrual } from "@/lib/engine/accrual";
import {
  PROJECTION_GUARD_DAY,
  combinedSpend,
  evaluateBudget,
  isCollecting,
  projection,
  runRate,
} from "@/lib/engine/budget";

const period = (dayOfPeriod: number, daysInPeriod = 30) => ({
  dayOfPeriod,
  daysInPeriod,
});

describe("runRate — linear projection", () => {
  it("scales spend by elapsed fraction of the period", () => {
    expect(runRate(100, period(10, 30))).toBe(300);
    expect(runRate(500, period(15, 30))).toBeCloseTo(1000);
  });

  it("is zero on day zero (no elapsed days to extrapolate from)", () => {
    expect(runRate(100, period(0, 30))).toBe(0);
  });
});

describe("projection guard — no run-rate before day 5", () => {
  it("suppresses the projection while collecting", () => {
    expect(isCollecting(PROJECTION_GUARD_DAY - 1)).toBe(true);
    expect(projection(100, period(4, 30))).toBeNull();
  });

  it("projects from day 5 onward", () => {
    expect(isCollecting(PROJECTION_GUARD_DAY)).toBe(false);
    expect(projection(100, period(5, 30))).toBe(600);
  });
});

describe("combinedSpend — display = seats + API×frozenFX", () => {
  it("converts the USD API part at the frozen rate", () => {
    expect(combinedSpend({ seatDisplay: 100, apiUsd: 50, fxRate: 5 })).toEqual({
      display: 350,
      unconvertedUsd: 0,
    });
  });

  it("keeps the USD part unconverted (never guessed) when no rate is frozen", () => {
    expect(combinedSpend({ seatDisplay: 100, apiUsd: 50, fxRate: null })).toEqual({
      display: 100,
      unconvertedUsd: 50,
    });
  });
});

describe("evaluateBudget — the full picture", () => {
  it("on-pace mid-period: projection lands exactly on budget", () => {
    const ev = evaluateBudget({ budget: 1000, spent: 500, period: period(15, 30) });
    expect(ev.projection).toBeCloseTo(1000);
    expect(ev.currentMargin).toBe(500);
    expect(ev.projectedMargin).toBeCloseTo(0);
    expect(ev.pctSpent).toBeCloseTo(0.5);
    expect(ev.pctElapsed).toBeCloseTo(0.5);
    expect(ev.breached).toBe(false);
    expect(ev.projectedBreach).toBe(false);
  });

  it("over-pace: projected margin goes negative and flags a projected breach", () => {
    const ev = evaluateBudget({ budget: 1000, spent: 600, period: period(15, 30) });
    expect(ev.projection).toBe(1200);
    expect(ev.projectedMargin).toBe(-200);
    expect(ev.projectedBreach).toBe(true);
    expect(ev.breached).toBe(false);
  });

  it("realized breach: spent already at or past budget", () => {
    const ev = evaluateBudget({ budget: 1000, spent: 1000, period: period(20, 30) });
    expect(ev.breached).toBe(true);
    expect(ev.currentMargin).toBe(0);
  });

  it("collecting: no projection, no projected margin before day 5", () => {
    const ev = evaluateBudget({ budget: 1000, spent: 300, period: period(3, 30) });
    expect(ev.collecting).toBe(true);
    expect(ev.projection).toBeNull();
    expect(ev.projectedMargin).toBeNull();
    expect(ev.projectedBreach).toBe(false);
  });

  it("caps pctElapsed at 1 on the last day", () => {
    const ev = evaluateBudget({ budget: 1000, spent: 900, period: period(30, 30) });
    expect(ev.pctElapsed).toBe(1);
  });
});

describe("seat accrual is included in tracked spend", () => {
  it("a monthly seat plan feeds the budget as its daily-accrued amount", () => {
    // 3000/month plan, day 10 of 30 → 1000 accrued, plus API spend.
    const seats = seatAccrual({
      seatCount: 10,
      unitPrice: 300,
      dayOfPeriod: 10,
      daysInPeriod: 30,
    });
    expect(seats).toBe(1000);

    const { display } = combinedSpend({ seatDisplay: seats, apiUsd: 40, fxRate: 5 });
    const ev = evaluateBudget({
      budget: 4000,
      spent: display, // 1000 seats + 200 API = 1200
      period: period(10, 30),
    });
    expect(ev.spent).toBe(1200);
    expect(ev.projection).toBe(3600); // 1200 / 10 * 30
    expect(ev.projectedMargin).toBe(400);
  });
});
