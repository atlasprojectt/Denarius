import { describe, expect, it } from "vitest";

import { evaluateBudget } from "@/lib/engine/budget";
import {
  activeLevels,
  highestLevel,
  notificationsToFire,
  severityRank,
  type ThresholdLevel,
} from "@/lib/engine/thresholds";

const period = (dayOfPeriod: number, daysInPeriod = 30) => ({
  dayOfPeriod,
  daysInPeriod,
});

describe("activeLevels — which crossings are live", () => {
  it("warning only: past 80% but not breached, projection within budget", () => {
    // day 29, spent 850 → projection ~879 (< 1000), pct 0.85.
    const ev = evaluateBudget({ budget: 1000, spent: 850, period: period(29, 30) });
    expect(activeLevels(ev)).toEqual(["warning"]);
  });

  it("projected_breach only: under 80% spent but run-rate closes over", () => {
    // day 5, spent 500 → projection 3000, pct 0.5.
    const ev = evaluateBudget({ budget: 1000, spent: 500, period: period(5, 30) });
    expect(activeLevels(ev)).toEqual(["projected_breach"]);
  });

  it("both warning and projected_breach, ascending by severity", () => {
    // day 15, spent 850 → projection 1700, pct 0.85.
    const ev = evaluateBudget({ budget: 1000, spent: 850, period: period(15, 30) });
    expect(activeLevels(ev)).toEqual(["warning", "projected_breach"]);
  });

  it("a realized breach is terminal — it subsumes the softer levels", () => {
    const ev = evaluateBudget({ budget: 1000, spent: 1100, period: period(15, 30) });
    expect(activeLevels(ev)).toEqual(["breach"]);
  });

  it("healthy budget crosses nothing", () => {
    const ev = evaluateBudget({ budget: 1000, spent: 300, period: period(15, 30) });
    expect(activeLevels(ev)).toEqual([]);
  });

  it("honors a custom warn threshold", () => {
    const ev = evaluateBudget({ budget: 1000, spent: 650, period: period(29, 30) });
    expect(activeLevels(ev, [0.6, 1.0])).toEqual(["warning"]);
    expect(activeLevels(ev, [0.8, 1.0])).toEqual([]);
  });
});

describe("severity ordering", () => {
  it("ranks breach > projected_breach > warning", () => {
    expect(severityRank("breach")).toBeGreaterThan(severityRank("projected_breach"));
    expect(severityRank("projected_breach")).toBeGreaterThan(severityRank("warning"));
  });

  it("highestLevel picks the most severe, null when empty", () => {
    expect(highestLevel(["warning", "projected_breach"])).toBe("projected_breach");
    expect(highestLevel(["breach", "warning"])).toBe("breach");
    expect(highestLevel([])).toBeNull();
  });
});

describe("notificationsToFire — dedup + escalation (invariant #6)", () => {
  const w: ThresholdLevel = "warning";
  const p: ThresholdLevel = "projected_breach";
  const b: ThresholdLevel = "breach";

  it("fires a fresh crossing when nothing was sent", () => {
    expect(notificationsToFire([w], [])).toEqual([w]);
  });

  it("never re-fires a level already sent this period", () => {
    expect(notificationsToFire([w], [w])).toEqual([]);
  });

  it("escalates to a strictly higher level", () => {
    expect(notificationsToFire([w, p], [w])).toEqual([p]);
    expect(notificationsToFire([b], [p])).toEqual([b]);
  });

  it("never downgrades: a re-crossed lower level after a higher one stays silent", () => {
    // Mid-period budget edit re-trips warning after a breach was already sent.
    expect(notificationsToFire([w], [b])).toEqual([]);
    expect(notificationsToFire([p], [b])).toEqual([]);
  });
});
