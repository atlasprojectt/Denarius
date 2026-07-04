// Denarius engine — derived cost from tokens × model price (pure, no I/O).
// Prices are versioned append-only rows; the applicable price for a usage day
// is the newest one whose effective_date is not after that day. A model with
// no applicable price is UNCOSTED — surfaced, never dropped (invariant #3).

export type ModelPrice = {
  provider: string;
  model: string;
  /** USD per 1M tokens. */
  inputPricePer1M: number;
  outputPricePer1M: number;
  /** yyyy-mm-dd. */
  effectiveDate: string;
};

export type DerivedCost =
  | { uncosted: false; cost: number }
  | { uncosted: true; cost: null };

export function deriveCost(
  usage: {
    provider: string;
    model: string;
    date: string;
    inputTokens: number;
    outputTokens: number;
  },
  prices: ModelPrice[],
): DerivedCost {
  const applicable = prices
    .filter(
      (p) =>
        p.provider === usage.provider &&
        p.model === usage.model &&
        p.effectiveDate <= usage.date,
    )
    .sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1))[0];

  if (!applicable) return { uncosted: true, cost: null };

  const cost =
    (usage.inputTokens / 1_000_000) * applicable.inputPricePer1M +
    (usage.outputTokens / 1_000_000) * applicable.outputPricePer1M;
  return { uncosted: false, cost };
}
