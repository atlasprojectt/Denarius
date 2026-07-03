import { describe, expect, it } from "vitest";

import { currentPeriod } from "@/lib/engine/period";

describe("currentPeriod — calendar month in UTC", () => {
  it("reports 31 days and the pt-BR label for July", () => {
    const p = currentPeriod(new Date("2026-07-03T12:00:00Z"));
    expect(p).toEqual({
      dayOfPeriod: 3,
      daysInPeriod: 31,
      monthLabel: "julho",
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
});
