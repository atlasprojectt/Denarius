import { describe, expect, it } from "vitest";

import { topDrivers } from "@/lib/engine/drivers";

describe("topDrivers — ranked contributors with shares", () => {
  const items = [
    { label: "Engineering", value: 60 },
    { label: "Data", value: 30 },
    { label: "Support", value: 10 },
  ];

  it("ranks descending and computes each share of the total", () => {
    const drivers = topDrivers(items);
    expect(drivers.map((d) => d.label)).toEqual(["Engineering", "Data", "Support"]);
    expect(drivers[0].share).toBeCloseTo(0.6);
    expect(drivers[1].share).toBeCloseTo(0.3);
    expect(drivers[2].share).toBeCloseTo(0.1);
  });

  it("truncates to the limit but shares stay against the full total", () => {
    const drivers = topDrivers(items, 2);
    expect(drivers).toHaveLength(2);
    // Share denominator is 100 (all positive), not the 90 of the top two.
    expect(drivers[0].share).toBeCloseTo(0.6);
    expect(drivers[1].share).toBeCloseTo(0.3);
  });

  it("drops non-positive contributions (not drivers of spend)", () => {
    const drivers = topDrivers([
      { label: "A", value: 50 },
      { label: "Zero", value: 0 },
      { label: "Refund", value: -5 },
    ]);
    expect(drivers.map((d) => d.label)).toEqual(["A"]);
    expect(drivers[0].share).toBeCloseTo(1);
  });

  it("returns nothing when there is no positive spend", () => {
    expect(topDrivers([{ label: "A", value: 0 }])).toEqual([]);
    expect(topDrivers([])).toEqual([]);
  });
});
