import { describe, expect, it } from "vitest";

import { percent, signedPercent, syncStamp } from "@/lib/format";

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

describe("signedPercent — the sign replaces acima/abaixo", () => {
  it("prefixes a plus above the reference and a true minus below it", () => {
    expect(signedPercent(0.124, 1)).toBe("+12,4%");
    expect(signedPercent(-0.031, 1)).toBe("\u22123,1%");
    expect(signedPercent(-0.3)).toBe("\u221230%");
  });

  it("leaves zero — and anything that rounds to it — unsigned", () => {
    expect(signedPercent(0, 1)).toBe("0,0%");
    expect(signedPercent(-0.0004, 1)).toBe("0,0%");
  });

  it("keeps percent() unsigned for plain shares", () => {
    expect(percent(0.85)).toBe("85%");
    expect(percent(-0.05)).toBe("-5%");
  });
});
