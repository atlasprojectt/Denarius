import { describe, expect, it } from "vitest";

import {
  closedPeriod,
  currentPeriod,
  monthLabelOf,
  monthRange,
  previousMonthOf,
} from "@/lib/engine/period";

describe("currentPeriod — calendar month in UTC", () => {
  it("reports 31 days and the pt-BR label for July", () => {
    const p = currentPeriod(new Date("2026-07-03T12:00:00Z"));
    expect(p).toEqual({
      dayOfPeriod: 3,
      daysInPeriod: 31,
      monthLabel: "julho",
      year: 2026,
      month: 7,
      monthStart: "2026-07-01",
    });
  });

  it("handles February in a non-leap year (28 days)", () => {
    const p = currentPeriod(new Date("2026-02-15T00:00:00Z"));
    expect(p.daysInPeriod).toBe(28);
    expect(p.dayOfPeriod).toBe(15);
  });

  it("handles February in a leap year (29 days)", () => {
    const p = currentPeriod(new Date("2028-02-29T00:00:00Z"));
    expect(p.daysInPeriod).toBe(29);
    expect(p.dayOfPeriod).toBe(29);
  });

  it("carries the month identity, so a period can say WHICH month it is", () => {
    const p = currentPeriod(new Date("2026-01-09T23:59:59Z"));
    expect({ year: p.year, month: p.month, monthStart: p.monthStart }).toEqual({
      year: 2026,
      month: 1,
      monthStart: "2026-01-01",
    });
  });
});

describe("closedPeriod — a month that has ended (#94)", () => {
  it("is fully elapsed, so the engine's projection lands on the realized total", () => {
    const p = closedPeriod(2026, 6);
    expect(p.dayOfPeriod).toBe(30);
    expect(p.daysInPeriod).toBe(30);
    expect(p.monthLabel).toBe("junho");
    expect(p.monthStart).toBe("2026-06-01");
  });

  it("knows February's length in a leap year", () => {
    expect(closedPeriod(2028, 2).daysInPeriod).toBe(29);
  });
});

describe("previousMonthOf", () => {
  it("steps back one month", () => {
    expect(previousMonthOf(new Date("2026-08-01T00:00:00Z"))).toEqual({
      year: 2026,
      month: 7,
    });
  });

  it("rolls the year back in January", () => {
    expect(previousMonthOf(new Date("2026-01-31T23:00:00Z"))).toEqual({
      year: 2025,
      month: 12,
    });
  });
});

describe("monthRange — closed-window bounds", () => {
  it("is half-open: nextStart is the first day of the following month", () => {
    expect(monthRange(2026, 7)).toEqual({
      start: "2026-07-01",
      nextStart: "2026-08-01",
    });
  });

  it("rolls into the next year in December", () => {
    expect(monthRange(2026, 12)).toEqual({
      start: "2026-12-01",
      nextStart: "2027-01-01",
    });
  });

  it("ends February on the right day", () => {
    expect(monthRange(2026, 2).nextStart).toBe("2026-03-01");
    expect(monthRange(2028, 2).nextStart).toBe("2028-03-01");
  });
});

describe("monthLabelOf", () => {
  it("names the month in pt-BR", () => {
    expect(monthLabelOf(2026, 3)).toBe("março");
    expect(monthLabelOf(2026, 12)).toBe("dezembro");
  });
});
