import "server-only";

import { monthStartUtc } from "@/lib/engine/period";
import { createClient } from "@/lib/supabase/server";

// Month-to-date API usage, read under RLS for the Explore screen. Rows are
// small daily aggregates (PRD: no time-series DB), so grouping happens here.

export type ModelUsage = {
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
  hasData: boolean;
};

type UsageRow = {
  model: string;
  input_tokens: number;
  output_tokens: number;
  derived_cost: number | null;
  uncosted: boolean;
};

export async function apiSpendMonthToDate(): Promise<ApiSpend> {
  const supabase = await createClient();
  const since = monthStartUtc();

  const [{ data: usageData }, { data: costData }] = await Promise.all([
    supabase
      .from("usage_daily")
      .select("model, input_tokens, output_tokens, derived_cost, uncosted")
      .gte("date", since),
    supabase.from("cost_daily").select("amount").gte("date", since),
  ]);

  const byModelMap = new Map<string, ModelUsage>();
  for (const row of (usageData ?? []) as UsageRow[]) {
    const entry = byModelMap.get(row.model) ?? {
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
    byModelMap.set(row.model, entry);
  }

  const byModel = [...byModelMap.values()].sort((a, b) => {
    if (a.uncosted !== b.uncosted) return a.uncosted ? 1 : -1;
    return (b.derivedCost ?? 0) - (a.derivedCost ?? 0);
  });

  const monthUsd = ((costData ?? []) as { amount: number }[]).reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  const derivedUsd = byModel.reduce(
    (sum, m) => sum + (m.derivedCost ?? 0),
    0,
  );

  return { monthUsd, derivedUsd, byModel, hasData: byModel.length > 0 };
}
