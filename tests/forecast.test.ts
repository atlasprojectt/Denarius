import { describe, expect, it } from "vitest";
import { forecast, type DailySpendPoint } from "@/lib/engine/forecast";

const period = (dayOfPeriod: number, daysInPeriod = 30) => ({ dayOfPeriod, daysInPeriod });
const points = (amounts: number[], start = "2026-01-01"): DailySpendPoint[] => amounts.map((amount, index) => ({ date: new Date(Date.parse(`${start}T00:00:00Z`) + index * 86_400_000).toISOString().slice(0, 10), amount }));

describe("forecast v2", () => {
  it("guards before day five", () => expect(forecast({ dailySpend: points([10, 10, 10, 10]), spent: 40, period: period(4) }).centralEstimate).toBeNull());
  it("projects a stable series from authoritative spent", () => expect(forecast({ dailySpend: points(Array(10).fill(100)), spent: 1000, period: period(10) }).centralEstimate).toBeCloseTo(3000));
  it("weights recent acceleration", () => expect(forecast({ dailySpend: points([10, 10, 10, 10, 10, 100, 100, 100, 100, 100]), spent: 540, period: period(10) }).centralEstimate).toBeGreaterThan(1500));
  it("caps an isolated outlier even when MAD is zero", () => expect(forecast({ dailySpend: points([100, 100, 100, 100, 100, 10_000]), spent: 10_500, period: period(6) }).centralEstimate).toBeLessThan(30_000));
  it("does not treat a missing day as zero", () => {
    const result = forecast({ dailySpend: [{ date: "2026-01-01", amount: 100 }, { date: "2026-01-03", amount: 100 }, { date: "2026-01-04", amount: 100 }, { date: "2026-01-05", amount: 100 }, { date: "2026-01-06", amount: 100 }], spent: 500, period: { ...period(6), startDate: "2026-01-01" } });
    expect(result.recentPace).toBeGreaterThan(0);
  });
  it("requires enough data for recurring behavior", () => expect(forecast({ dailySpend: points(Array(7).fill(100)), spent: 700, period: period(7) }).confidence).toBe("medium"));
  it("reports range and risk without claiming statistical probability", () => {
    const result = forecast({ dailySpend: points(Array(10).fill(100)), spent: 1000, period: period(10), budget: 2500 });
    expect(result.probableRange?.high).toBeGreaterThanOrEqual(result.centralEstimate!);
    expect(result.breachRisk).toBe("likely");
  });
  it("rejects duplicate, invalid and out-of-period dates", () => {
    expect(() => forecast({ dailySpend: [{ date: "2026-01-01", amount: 1 }, { date: "2026-01-01", amount: 1 }], spent: 2, period: period(5) })).toThrow();
    expect(() => forecast({ dailySpend: [{ date: "bad", amount: 1 }], spent: 1, period: period(5) })).toThrow();
    expect(() => forecast({ dailySpend: [{ date: "2026-02-01", amount: 1 }], spent: 1, period: { ...period(5), startDate: "2026-01-01" } })).toThrow();
  });
  it("is deterministic", () => {
    const input = { dailySpend: points([10, 20, 30, 20, 30]), spent: 110, period: period(5) };
    expect(forecast(input)).toEqual(forecast(input));
  });
});
