import { describe, expect, it } from "vitest";

import {
  newestUnseenPeriod,
  parseSeenPeriods,
  serializeSeenPeriods,
} from "@/lib/reports/seen";

describe("parseSeenPeriods", () => {
  it("returns an empty list for missing or broken storage", () => {
    expect(parseSeenPeriods(null)).toEqual([]);
    expect(parseSeenPeriods("")).toEqual([]);
    expect(parseSeenPeriods("not-json")).toEqual([]);
    expect(parseSeenPeriods('{"2026-08":true}')).toEqual([]);
  });

  it("keeps only string entries", () => {
    expect(parseSeenPeriods('["2026-08",42,null]')).toEqual(["2026-08"]);
  });
});

describe("serializeSeenPeriods", () => {
  it("round-trips through parse", () => {
    const raw = serializeSeenPeriods(["2026-07", "2026-08"]);
    expect(parseSeenPeriods(raw)).toEqual(["2026-07", "2026-08"]);
  });
});

describe("newestUnseenPeriod", () => {
  it("is null without any closed month", () => {
    expect(newestUnseenPeriod(null, [])).toBeNull();
  });

  it("reports the newest month until it is opened", () => {
    expect(newestUnseenPeriod("2026-08", [])).toBe("2026-08");
    expect(newestUnseenPeriod("2026-08", ["2026-07"])).toBe("2026-08");
    expect(newestUnseenPeriod("2026-08", ["2026-08"])).toBeNull();
  });
});
