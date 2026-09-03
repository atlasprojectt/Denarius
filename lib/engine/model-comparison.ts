import { deriveCost, type ModelPrice } from "./derive";

export type ComparisonUsage = {
  date: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  derivedCost: number | null;
  uncosted?: boolean;
  teamId?: string | null;
};

export type ModelComparison = {
  scope: "org" | "team" | "unattributed";
  teamId: string | null;
  sourceProvider: string;
  sourceModel: string;
  alternativeProvider: string;
  alternativeModel: string;
  inputTokens: number;
  outputTokens: number;
  sourceCostUsd: number | null;
  reportedSourceCostUsd: number | null;
  derivedSourceCostUsd: number | null;
  equivalentCostUsd: number | null;
  deltaUsd: number | null;
  deltaPct: number | null;
  projectedCostUsd: number | null;
  projectedBudgetMarginUsd: number | null;
  budgetFit: "under" | "over" | "unknown";
  status: "available" | "uncosted" | "insufficient_data" | "not_comparable";
  partialCoverage: boolean;
  coverageDays: number;
  expectedDays: number | null;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const valid = (n: number) => Number.isFinite(n) && n >= 0;

function validate(rows: ComparisonUsage[], prices: ModelPrice[]): void {
  for (const row of rows) {
    if (!DATE.test(row.date) || Number.isNaN(Date.parse(`${row.date}T00:00:00Z`)) || !row.provider || !row.model || !valid(row.inputTokens) || !valid(row.outputTokens) || (row.derivedCost !== null && !valid(row.derivedCost))) throw new Error("Invalid model comparison usage");
  }
  for (const price of prices) {
    if (!price.provider || !price.model || !DATE.test(price.effectiveDate) || Number.isNaN(Date.parse(`${price.effectiveDate}T00:00:00Z`)) || !valid(price.inputPricePer1M) || !valid(price.outputPricePer1M)) throw new Error("Invalid model comparison price");
  }
}

function pct(delta: number | null, source: number | null): number | null {
  return delta === null || source === null || source === 0 ? null : delta / source;
}

/** Compare the observed token mix against one alternative model financially. */
export function compareModel(input: {
  usage: ComparisonUsage[];
  alternative: Pick<ModelPrice, "provider" | "model">;
  prices: ModelPrice[];
  budget?: number | null;
  projectedCostUsd?: number | null;
  expectedDays?: number;
  periodStart?: string;
  periodEnd?: string;
  scope?: "org" | "team" | "unattributed";
  teamId?: string | null;
  reportedSourceCostUsd?: number | null;
}): ModelComparison {
  const { usage, alternative, prices, budget = null, projectedCostUsd = null, expectedDays, periodStart, periodEnd, scope = "org", teamId = null, reportedSourceCostUsd = null } = input;
  validate(usage, prices);
  if (periodStart && (!DATE.test(periodStart) || Number.isNaN(Date.parse(`${periodStart}T00:00:00Z`)))) throw new Error("Invalid comparison period start");
  if (periodEnd && (!DATE.test(periodEnd) || Number.isNaN(Date.parse(`${periodEnd}T00:00:00Z`)))) throw new Error("Invalid comparison period end");
  if (periodStart && periodEnd && periodStart >= periodEnd) throw new Error("Comparison period must be ordered");
  if (reportedSourceCostUsd !== null && !valid(reportedSourceCostUsd)) throw new Error("Invalid reported source cost");
  if (budget !== null && budget !== undefined && !valid(budget)) throw new Error("Invalid comparison budget");
  if (projectedCostUsd !== null && projectedCostUsd !== undefined && !valid(projectedCostUsd)) throw new Error("Invalid projected cost");
  const inPeriod = (date: string) => (!periodStart || date >= periodStart) && (!periodEnd || date < periodEnd);
  if (usage.some((row) => !inPeriod(row.date))) throw new Error("Usage is outside comparison period");
  const usageKeys = new Set<string>();
  for (const row of usage) {
    const key = `${row.date}|${row.provider}|${row.model}|${row.teamId ?? "__unattributed__"}`;
    if (usageKeys.has(key)) throw new Error("Duplicate usage bucket in comparison");
    usageKeys.add(key);
  }
  if (scope === "team" && !teamId) throw new Error("Team comparisons require a team id");
  if (scope !== "team" && teamId !== null) throw new Error("Only team comparisons accept a team id");
  const source = usage[0];
  const coverageDays = new Set(usage.map((row) => row.date)).size;
  const partialCoverage = expectedDays !== undefined && coverageDays < expectedDays;
  const base = { scope, teamId, sourceProvider: source?.provider ?? "", sourceModel: source?.model ?? "", alternativeProvider: alternative.provider, alternativeModel: alternative.model, inputTokens: usage.reduce((sum, row) => sum + row.inputTokens, 0), outputTokens: usage.reduce((sum, row) => sum + row.outputTokens, 0), sourceCostUsd: null as number | null, reportedSourceCostUsd, derivedSourceCostUsd: null as number | null, equivalentCostUsd: null as number | null, deltaUsd: null as number | null, deltaPct: null as number | null, projectedCostUsd: null as number | null, projectedBudgetMarginUsd: null as number | null, budgetFit: "unknown" as const, status: "insufficient_data" as const, partialCoverage, coverageDays, expectedDays: expectedDays ?? null };
  if (!source) return { ...base, status: "insufficient_data" };
  if (usage.some((row) => row.teamId !== undefined && (scope === "team" ? row.teamId !== teamId : scope === "unattributed" ? row.teamId !== null : row.teamId !== undefined))) return { ...base, status: "not_comparable" };
  if (usage.some((row) => row.provider !== source.provider || row.model !== source.model) || !alternative.provider || !alternative.model) return { ...base, status: "not_comparable" };
  const derivedSourceCost = usage.every((row) => !row.uncosted && row.derivedCost !== null) ? usage.reduce((sum, row) => sum + (row.derivedCost ?? 0), 0) : null;
  const sourceCost = reportedSourceCostUsd ?? derivedSourceCost;
  const equivalent = usage.map((row) => deriveCost({ provider: alternative.provider, model: alternative.model, date: row.date, inputTokens: row.inputTokens, outputTokens: row.outputTokens }, prices));
  if (sourceCost === null) return { ...base, sourceCostUsd: null, derivedSourceCostUsd: derivedSourceCost, status: "uncosted" };
  if (equivalent.some((cost) => cost.uncosted)) return { ...base, sourceCostUsd: sourceCost, derivedSourceCostUsd: derivedSourceCost, status: "uncosted" };
  const equivalentCostUsd = equivalent.reduce((sum, cost) => sum + (cost.cost ?? 0), 0);
  const deltaUsd = equivalentCostUsd - sourceCost;
  const projected = partialCoverage || projectedCostUsd === null ? null : projectedCostUsd + deltaUsd;
  const margin = projected === null || budget === null ? null : budget - projected;
  return { ...base, sourceCostUsd: sourceCost, derivedSourceCostUsd: derivedSourceCost, equivalentCostUsd, deltaUsd, deltaPct: pct(deltaUsd, sourceCost), projectedCostUsd: projected, projectedBudgetMarginUsd: margin, budgetFit: margin === null ? "unknown" : margin >= 0 ? "under" : "over", status: partialCoverage ? "insufficient_data" : "available" };
}

export function compareModels(input: {
  usage: ComparisonUsage[];
  alternatives: Pick<ModelPrice, "provider" | "model">[];
  prices: ModelPrice[];
  budget?: number | null;
  projectedCostUsd?: number | null;
  expectedDays?: number;
  periodStart?: string;
  periodEnd?: string;
  scope?: "org" | "team" | "unattributed";
  teamId?: string | null;
  reportedSourceCostUsd?: number | null;
}): ModelComparison[] {
  const keys = input.alternatives.map((alternative) => `${alternative.provider}:${alternative.model}`);
  if (new Set(keys).size !== keys.length) throw new Error("Duplicate model comparison alternative");
  return input.alternatives.map((alternative) => compareModel({ ...input, alternative }));
}
