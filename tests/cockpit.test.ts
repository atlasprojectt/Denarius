import { describe, expect, it } from "vitest";

import { buildCockpit, warnPctFromThresholds, type CockpitInput } from "@/lib/engine/cockpit";

const period = (dayOfPeriod: number, daysInPeriod = 30) => ({ dayOfPeriod, daysInPeriod });

// A team at day 15/30: spend N against budget B, seats-only (fx irrelevant).
const team = (
  teamId: string,
  teamName: string,
  spent: number,
  budget: number,
): CockpitInput["teams"][number] => ({
  teamId,
  teamName,
  budget,
  seatDisplay: spent,
  apiUsd: 0,
  fxRate: 1,
  thresholds: [0.8, 1.0],
});

const base = (overrides: Partial<CockpitInput> = {}): CockpitInput => ({
  period: period(15),
  currency: "BRL",
  periodEndLabel: "30 de junho",
  org: { budget: 1000, seatDisplay: 300, apiUsd: 0, fxRate: 1, thresholds: [0.8, 1.0] },
  teams: [],
  composition: [],
  ...overrides,
});

describe("buildCockpit — the Home view model", () => {
  it("cold start when there is no org budget", () => {
    const c = buildCockpit(base({ org: null }));
    expect(c.state).toBe("cold-start");
  });

  it("ready: evaluates the org and produces a verdict", () => {
    const c = buildCockpit(base());
    if (c.state !== "ready") throw new Error("expected ready");
    expect(c.org.spent).toBe(300);
    expect(c.org.budget).toBe(1000);
    expect(c.orgPctProjected).toBe(0.6);
    // day 15/30, spent 300 → projection 600, under budget → green.
    expect(c.verdict.status).toBe("green");
    expect(c.verdict.teamId).toBeNull();
    expect(c.allClear).toBe(true);
  });

  it("partitions teams: breached/over-pace need attention, healthy are under control", () => {
    const c = buildCockpit(
      base({
        org: { budget: 3000, seatDisplay: 1600, apiUsd: 0, fxRate: 1, thresholds: [0.8, 1.0] },
        teams: [
          team("t1", "Eng", 520, 500), // breach
          team("t2", "Data", 480, 500), // 96% → warning
          team("t3", "Ops", 100, 500), // healthy
        ],
      }),
    );
    if (c.state !== "ready") throw new Error("expected ready");
    expect(c.needsAttention.map((t) => t.teamName)).toEqual(["Eng", "Data"]);
    expect(c.underControl.map((t) => t.teamName)).toEqual(["Ops"]);
    // A realized breach outranks a warning.
    expect(c.needsAttention[0].status).toBe("red");
    expect(c.needsAttention[1].status).toBe("amber");
    // The red verdict surfaces the breached team's id for the "Ver time" action.
    expect(c.verdict.teamId).toBe("t1");
    expect(c.needsAttention[1].pctProjected).toBeCloseTo(1.92);
    expect(c.allClear).toBe(false);
  });

  it("orders needs-attention by severity then overrun", () => {
    const c = buildCockpit(
      base({
        org: { budget: 5000, seatDisplay: 3000, apiUsd: 0, fxRate: 1, thresholds: [0.8, 1.0] },
        teams: [
          team("small", "Small", 510, 500), // breach, overrun 10
          team("big", "Big", 900, 500), // breach, overrun 400
          team("warn", "Warn", 450, 500), // warning
        ],
      }),
    );
    if (c.state !== "ready") throw new Error("expected ready");
    expect(c.needsAttention.map((t) => t.teamName)).toEqual(["Big", "Small", "Warn"]);
  });

  it("composition: seats + providers converted at frozen FX, ranked, shares sum to 1", () => {
    const c = buildCockpit(
      base({
        org: { budget: 10000, seatDisplay: 2000, apiUsd: 1000, fxRate: 5, thresholds: [0.8, 1.0] },
        composition: [
          { provider: "openai", usd: 600 },
          { provider: "anthropic", usd: 400 },
        ],
      }),
    );
    if (c.state !== "ready") throw new Error("expected ready");
    // seats 2000, openai 3000 (600×5), anthropic 2000 (400×5) → openai leads.
    expect(c.composition.map((e) => e.key)).toEqual(["openai", "seats", "anthropic"]);
    const total = c.composition.reduce((s, e) => s + e.share, 0);
    expect(total).toBeCloseTo(1);
    expect(c.orgUnconvertedUsd).toBe(0);
  });

  it("no FX: API cost stays out of the display total and composition, disclosed as unconverted", () => {
    const c = buildCockpit(
      base({
        org: { budget: 10000, seatDisplay: 2000, apiUsd: 1000, fxRate: null, thresholds: [0.8, 1.0] },
        composition: [{ provider: "openai", usd: 1000 }],
      }),
    );
    if (c.state !== "ready") throw new Error("expected ready");
    expect(c.org.spent).toBe(2000); // seats only
    expect(c.orgUnconvertedUsd).toBe(1000);
    expect(c.composition.map((e) => e.key)).toEqual(["seats"]);
  });

  it("threads the configured warn threshold into team and org", () => {
    const c = buildCockpit(
      base({
        org: { budget: 1000, seatDisplay: 850, apiUsd: 0, fxRate: 1, thresholds: [0.7, 1.0] },
        teams: [{ ...team("t1", "Eng", 480, 500), thresholds: [0.9, 1.0] }],
      }),
    );
    if (c.state !== "ready") throw new Error("expected ready");
    expect(c.orgWarnPct).toBe(70);
    expect(c.needsAttention[0].warnPct).toBe(90);
  });
});

describe("warnPctFromThresholds", () => {
  it("takes the highest sub-100% threshold", () => {
    expect(warnPctFromThresholds([0.8, 1.0])).toBe(80);
    expect(warnPctFromThresholds([0.5, 0.9, 1.0])).toBe(90);
  });

  it("defaults to 80 when none configured", () => {
    expect(warnPctFromThresholds([1.0])).toBe(80);
    expect(warnPctFromThresholds([])).toBe(80);
  });
});
