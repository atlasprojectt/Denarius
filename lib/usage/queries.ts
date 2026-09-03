import "server-only";

import type { ModelPrice } from "@/lib/engine/derive";
import { monthStartUtc } from "@/lib/engine/period";
import { createClient } from "@/lib/supabase/server";

// Month-to-date API usage, read under RLS for the Explore screen. Rows are
// small daily aggregates (PRD: no time-series DB), so grouping happens here.

export type ModelUsage = {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** null when any bucket for this model is uncosted. */
  derivedCost: number | null;
  uncosted: boolean;
};

export type ApiSpend = {
  /** Provider-reported month total in USD (cost_daily — the headline truth). */
  monthUsd: number;
  /** Σ derived costs (tokens × price) for the same window, costed models only. */
  derivedUsd: number;
  byModel: ModelUsage[]; // sorted desc by derived cost, uncosted last
  comparisonUsage: Array<{ date: string; provider: string; model: string; inputTokens: number; outputTokens: number; derivedCost: number | null; uncosted: boolean }>;
  modelPrices: ModelPrice[];
  hasData: boolean;
};

type UsageRow = {
  date: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  derived_cost: number | null;
  uncosted: boolean;
};

type PriceRow = {
  provider: string;
  model: string;
  input_price_per_1m: number;
  output_price_per_1m: number;
  effective_date: string;
};

export async function apiSpendMonthToDate(): Promise<ApiSpend> {
  const supabase = await createClient();
  const since = monthStartUtc();

  const [{ data: usageData }, { data: costData }, { data: priceData }] = await Promise.all([
    supabase
      .from("usage_daily")
      .select("date, provider, model, input_tokens, output_tokens, derived_cost, uncosted")
      .gte("date", since),
    supabase.from("cost_daily").select("amount").gte("date", since),
    supabase
      .from("model_price")
      .select("provider, model, input_price_per_1m, output_price_per_1m, effective_date"),
  ]);

  const byModelMap = new Map<string, ModelUsage>();
  const comparisonMap = new Map<string, { date: string; provider: string; model: string; inputTokens: number; outputTokens: number; derivedCost: number | null; uncosted: boolean }>();
  for (const row of (usageData ?? []) as UsageRow[]) {
    const key = `${row.provider}:${row.model}`;
    const comparisonKey = `${row.date}:${key}`;
    const comparison = comparisonMap.get(comparisonKey) ?? {
      date: row.date,
      provider: row.provider,
      model: row.model,
      inputTokens: 0,
      outputTokens: 0,
      derivedCost: 0,
      uncosted: false,
    };
    comparison.inputTokens += row.input_tokens;
    comparison.outputTokens += row.output_tokens;
    comparison.uncosted ||= row.uncosted;
    if (comparison.uncosted || row.derived_cost === null) comparison.derivedCost = null;
    else if (comparison.derivedCost !== null) comparison.derivedCost += row.derived_cost;
    comparisonMap.set(comparisonKey, comparison);
    const entry = byModelMap.get(key) ?? {
      provider: row.provider,
      model: row.model,
      inputTokens: 0,
      outputTokens: 0,
      derivedCost: 0,
      uncosted: false,
    };
    entry.inputTokens += row.input_tokens;
    entry.outputTokens += row.output_tokens;
    if (row.uncosted || row.derived_cost === null) {
      entry.uncosted = true;
      entry.derivedCost = null;
    } else if (entry.derivedCost !== null) {
      entry.derivedCost += row.derived_cost;
    }
    byModelMap.set(key, entry);
  }

  const byModel = [...byModelMap.values()].sort((a, b) => {
    if (a.uncosted !== b.uncosted) return a.uncosted ? 1 : -1;
    return (b.derivedCost ?? 0) - (a.derivedCost ?? 0);
  });
  const comparisonUsage = [...comparisonMap.values()];

  const monthUsd = ((costData ?? []) as { amount: number }[]).reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  const derivedUsd = byModel.reduce(
    (sum, m) => sum + (m.derivedCost ?? 0),
    0,
  );

  const modelPrices = ((priceData ?? []) as PriceRow[]).map((price) => ({
    provider: price.provider,
    model: price.model,
    inputPricePer1M: Number(price.input_price_per_1m),
    outputPricePer1M: Number(price.output_price_per_1m),
    effectiveDate: price.effective_date,
  }));

  return { monthUsd, derivedUsd, byModel, comparisonUsage, modelPrices, hasData: byModel.length > 0 };
}
