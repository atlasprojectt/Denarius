import { describe, expect, it } from "vitest";

import { combinedSpend } from "@/lib/engine/budget";
import {
  costBridge,
  periodFx,
  usdDisplay,
  type FrozenFx,
  type FxCarrier,
} from "@/lib/engine/money-model";

// WP1 of the 2026-07-11 audit plan: the monetary display contract. The same
// concept must produce the same number on every screen; missing FX must never
// let USD and BRL be summed or a guessed conversion be shown.

const fx: FrozenFx = { rate: 5.0, source: "open.er-api.com", date: "2026-07-01" };

const carrier = (
  rate: number | null,
  date: string | null = "2026-07-01",
): FxCarrier => ({
  frozenFxRate: rate,
  fxRateSource: rate === null ? null : "open.er-api.com",
  fxRateDate: rate === null ? null : date,
});

describe("periodFx — one frozen rate per tenant per period", () => {
  it("prefers the org budget's captured rate", () => {
    const resolved = periodFx({
      org: carrier(5.1),
      teams: [{ ...carrier(5.4), teamId: "t1" }],
    });
    expect(resolved).toEqual({
      rate: 5.1,
      source: "open.er-api.com",
      date: "2026-07-01",
    });
  });

  it("falls back to the earliest-captured team rate when the org has none", () => {
    const resolved = periodFx({
      org: carrier(null),
      teams: [
        { ...carrier(5.4, "2026-07-03"), teamId: "t-later" },
        { ...carrier(5.2, "2026-07-01"), teamId: "t-earlier" },
      ],
    });
    expect(resolved?.rate).toBe(5.2);
  });

  it("breaks capture-date ties by team id (deterministic pick)", () => {
    const resolved = periodFx({
      org: null,
      teams: [
        { ...carrier(5.4, "2026-07-01"), teamId: "b" },
        { ...carrier(5.2, "2026-07-01"), teamId: "a" },
      ],
    });
    expect(resolved?.rate).toBe(5.2);
  });

  it("skips carriers without a rate and returns null when none carries one", () => {
    expect(
      periodFx({ org: carrier(null), teams: [{ ...carrier(null), teamId: "t1" }] }),
    ).toBeNull();
    expect(periodFx({ org: null, teams: [] })).toBeNull();
  });

  it("uses a team rate even when the org budget exists but captured none", () => {
    const resolved = periodFx({
      org: carrier(null),
      teams: [{ ...carrier(5.3), teamId: "t1" }],
    });
    expect(resolved?.rate).toBe(5.3);
  });
});

describe("usdDisplay — BRL-primary with the USD original attached", () => {
  it("converts at the frozen rate and keeps the original", () => {
    const v = usdDisplay(237.05, "BRL", fx);
    expect(v.display).toBeCloseTo(1185.25);
    expect(v.usd).toBe(237.05);
    expect(v.currency).toBe("BRL");
    expect(v.fx).toEqual(fx);
  });

  it("returns display null when the FX rate is missing — never a guess", () => {
    const v = usdDisplay(237.05, "BRL", null);
    expect(v.display).toBeNull();
    expect(v.usd).toBe(237.05);
  });
});

describe("costBridge — governed total = seats + API × frozen FX", () => {
  it("bridges the audit's example: seats + API explain the governed total", () => {
    // Audit S1: card said R$ 1.477,75 while the person table said US$ 237,05.
    // The bridge makes the relationship explicit instead of contradictory.
    const bridge = costBridge({
      currency: "BRL",
      seatDisplay: 292.5,
      apiUsd: 237.05,
      fx,
    });
    expect(bridge.apiDisplay).toBeCloseTo(1185.25);
    expect(bridge.governedDisplay).toBeCloseTo(1477.75);
  });

  it("matches combinedSpend exactly — Home and team detail cannot drift", () => {
    const inputs = { seatDisplay: 255.48, apiUsd: 293.7 };
    const bridge = costBridge({ currency: "BRL", ...inputs, fx });
    const combined = combinedSpend({ ...inputs, fxRate: fx.rate });
    expect(bridge.governedDisplay).toBe(combined.display);
  });

  it("declares the governed total unknown when FX is missing and API spend exists", () => {
    const bridge = costBridge({
      currency: "BRL",
      seatDisplay: 100,
      apiUsd: 50,
      fx: null,
    });
    expect(bridge.apiDisplay).toBeNull();
    expect(bridge.governedDisplay).toBeNull();
  });

  it("is exact with seats only — no FX needed when there is no USD part", () => {
    const bridge = costBridge({
      currency: "BRL",
      seatDisplay: 100,
      apiUsd: 0,
      fx: null,
    });
    expect(bridge.governedDisplay).toBe(100);
  });
});
