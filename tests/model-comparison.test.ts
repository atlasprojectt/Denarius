import { describe, expect, it } from "vitest";
import { compareModel, compareModels, type ComparisonUsage } from "@/lib/engine/model-comparison";

const prices = [
  { provider: "openai", model: "source", inputPricePer1M: 10, outputPricePer1M: 20, effectiveDate: "2026-01-01" },
  { provider: "openai", model: "cheap", inputPricePer1M: 5, outputPricePer1M: 10, effectiveDate: "2026-01-01" },
  { provider: "openai", model: "cheap", inputPricePer1M: 8, outputPricePer1M: 16, effectiveDate: "2026-02-01" },
  { provider: "anthropic", model: "claude", inputPricePer1M: 4, outputPricePer1M: 8, effectiveDate: "2026-01-01" },
];
const usage: ComparisonUsage[] = [{ date: "2026-02-15", provider: "openai", model: "source", inputTokens: 1_000_000, outputTokens: 500_000, derivedCost: 20 }];

describe("model comparison", () => {
  it("calculates equivalent cost, delta and budget fit", () => {
    const result = compareModel({ usage, alternative: { provider: "openai", model: "cheap" }, prices, budget: 30, projectedCostUsd: 25 });
    expect(result.equivalentCostUsd).toBe(16);
    expect(result.deltaUsd).toBe(-4);
    expect(result.deltaPct).toBe(-0.2);
    expect(result.projectedCostUsd).toBe(21);
    expect(result.budgetFit).toBe("under");
    expect(result.status).toBe("available");
  });
  it("uses the price effective on each usage date", () => {
    const result = compareModel({ usage: [{ ...usage[0], date: "2026-01-15" }], alternative: { provider: "openai", model: "cheap" }, prices });
    expect(result.equivalentCostUsd).toBe(10);
  });
  it("marks uncosted source or alternative honestly", () => {
    expect(compareModel({ usage: [{ ...usage[0], derivedCost: null, uncosted: true }], alternative: { provider: "openai", model: "cheap" }, prices }).status).toBe("uncosted");
    expect(compareModel({ usage, alternative: { provider: "openai", model: "missing" }, prices }).status).toBe("uncosted");
  });
  it("allows financially compatible cross-provider comparisons", () => expect(compareModel({ usage, alternative: { provider: "anthropic", model: "claude" }, prices }).status).toBe("available"));
  it("marks an empty sample as insufficient", () => expect(compareModel({ usage: [], alternative: { provider: "openai", model: "cheap" }, prices }).status).toBe("insufficient_data"));
  it("handles missing budget, partial coverage and zero source cost", () => {
    const result = compareModel({ usage, alternative: { provider: "openai", model: "cheap" }, prices, expectedDays: 2 });
    expect(result.budgetFit).toBe("unknown");
    expect(result.partialCoverage).toBe(true);
    expect(compareModel({ usage: [{ ...usage[0], derivedCost: 0 }], alternative: { provider: "openai", model: "cheap" }, prices }).deltaPct).toBeNull();
  });
  it("supports multiple alternatives deterministically", () => {
    const result = compareModels({ usage, alternatives: [{ provider: "openai", model: "cheap" }, { provider: "openai", model: "source" }], prices });
    expect(result.map((item) => item.alternativeModel)).toEqual(["cheap", "source"]);
    expect(compareModels({ usage, alternatives: [{ provider: "openai", model: "cheap" }], prices })).toEqual(compareModels({ usage, alternatives: [{ provider: "openai", model: "cheap" }], prices }));
  });
});
