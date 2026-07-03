import { describe, expect, it } from "vitest";

import { deriveCost, type ModelPrice } from "@/lib/engine/derive";

const prices: ModelPrice[] = [
  { provider: "openai", model: "gpt-4o", inputPricePer1M: 2.5, outputPricePer1M: 10, effectiveDate: "2026-01-01" },
  // A later price for the same model — must win for usage on/after its date.
  { provider: "openai", model: "gpt-4o", inputPricePer1M: 2.0, outputPricePer1M: 8, effectiveDate: "2026-06-15" },
  { provider: "openai", model: "gpt-4o-mini", inputPricePer1M: 0.15, outputPricePer1M: 0.6, effectiveDate: "2026-01-01" },
  // Anthropic price for the same model name must never leak across providers.
  { provider: "anthropic", model: "gpt-4o", inputPricePer1M: 99, outputPricePer1M: 99, effectiveDate: "2026-01-01" },
];

describe("deriveCost — tokens × versioned model price", () => {
  it("computes cost = tokens/1M × price for each side", () => {
    const result = deriveCost(
      { provider: "openai", model: "gpt-4o-mini", date: "2026-07-01", inputTokens: 4_000_000, outputTokens: 1_000_000 },
      prices,
    );
    // 4 × 0.15 + 1 × 0.60 = 1.20
    expect(result).toEqual({ uncosted: false, cost: 1.2 });
  });

  it("picks the newest price whose effective_date is not after the usage day", () => {
    const before = deriveCost(
      { provider: "openai", model: "gpt-4o", date: "2026-06-14", inputTokens: 1_000_000, outputTokens: 0 },
      prices,
    );
    const after = deriveCost(
      { provider: "openai", model: "gpt-4o", date: "2026-06-15", inputTokens: 1_000_000, outputTokens: 0 },
      prices,
    );
    expect(before).toEqual({ uncosted: false, cost: 2.5 });
    expect(after).toEqual({ uncosted: false, cost: 2.0 });
  });

  it("marks unknown models as uncosted instead of dropping them", () => {
    const result = deriveCost(
      { provider: "openai", model: "omni-nova", date: "2026-07-01", inputTokens: 800_000, outputTokens: 200_000 },
      prices,
    );
    expect(result).toEqual({ uncosted: true, cost: null });
  });

  it("ignores prices from another provider and prices from the future", () => {
    const crossProvider = deriveCost(
      { provider: "anthropic", model: "gpt-4o-mini", date: "2026-07-01", inputTokens: 1, outputTokens: 0 },
      prices,
    );
    expect(crossProvider.uncosted).toBe(true);

    const beforeAnyPrice = deriveCost(
      { provider: "openai", model: "gpt-4o", date: "2025-12-31", inputTokens: 1, outputTokens: 0 },
      prices,
    );
    expect(beforeAnyPrice.uncosted).toBe(true);
  });
});
