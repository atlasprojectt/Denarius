import { describe, expect, it } from "vitest";

import { syncStamp } from "@/lib/format";

describe("syncStamp", () => {
  it("renders today's sync in São Paulo without technical UTC copy", () => {
    expect(
      syncStamp("2026-07-17T06:59:31.000Z", new Date("2026-07-17T12:00:00.000Z")),
    ).toBe("hoje, às 03:59");
  });

  it("includes the local date for an older sync", () => {
    expect(
      syncStamp("2026-07-16T06:59:31.000Z", new Date("2026-07-17T12:00:00.000Z")),
    ).toBe("em 16/07/2026, às 03:59");
  });
});
