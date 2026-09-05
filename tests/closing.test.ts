import { describe, expect, it } from "vitest";

import { closingCardState, FEATURE_DAYS } from "@/lib/reports/closing";

const SEPT_10 = new Date(Date.UTC(2026, 8, 10, 12, 0, 0));

describe("closingCardState", () => {
  it("locks the running month with its last day while it cannot close yet", () => {
    expect(closingCardState(SEPT_10, [])).toEqual({
      mode: "locked",
      periodMonth: "2026-09-01",
      availableOn: "2026-09-30",
    });
  });

  it("features the just-ended month once its snapshot exists", () => {
    const oct1 = new Date(Date.UTC(2026, 9, 1, 12, 0, 0));
    expect(closingCardState(oct1, ["2026-09-01"])).toEqual({
      mode: "featured",
      periodMonth: "2026-09-01",
      periodPath: "2026-09",
    });
  });

  it("keeps the feature for five days after the close, then files it away", () => {
    expect(FEATURE_DAYS).toBe(5);
    // 30/09 available, 01–04/10 still featured, 05/10 leaves the spotlight.
    const oct4 = new Date(Date.UTC(2026, 9, 4, 23, 59, 59));
    expect(closingCardState(oct4, ["2026-09-01"])).toMatchObject({
      mode: "featured",
      periodPath: "2026-09",
    });
    const oct5 = new Date(Date.UTC(2026, 9, 5, 0, 0, 1));
    expect(closingCardState(oct5, ["2026-09-01"])).toEqual({
      mode: "locked",
      periodMonth: "2026-10-01",
      availableOn: "2026-10-31",
    });
  });

  it("ignores snapshots older than the month that just ended", () => {
    const oct2 = new Date(Date.UTC(2026, 9, 2, 12, 0, 0));
    expect(closingCardState(oct2, ["2026-08-01"])).toMatchObject({
      mode: "locked",
      periodMonth: "2026-10-01",
    });
  });

  it("rolls the feature and the lock across the year boundary", () => {
    const jan3 = new Date(Date.UTC(2026, 0, 3, 12, 0, 0));
    expect(closingCardState(jan3, ["2025-12-01"])).toEqual({
      mode: "featured",
      periodMonth: "2025-12-01",
      periodPath: "2025-12",
    });
    const jan6 = new Date(Date.UTC(2026, 0, 6, 12, 0, 0));
    expect(closingCardState(jan6, ["2025-12-01"])).toEqual({
      mode: "locked",
      periodMonth: "2026-01-01",
      availableOn: "2026-01-31",
    });
    const dec = new Date(Date.UTC(2026, 11, 10, 12, 0, 0));
    expect(closingCardState(dec, [])).toEqual({
      mode: "locked",
      periodMonth: "2026-12-01",
      availableOn: "2026-12-31",
    });
  });
});
