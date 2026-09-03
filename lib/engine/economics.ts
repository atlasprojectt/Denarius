export type EconomicsUsageRow = {
  date: string;
  provider: string;
  model: string;
  teamId?: string | null;
  inputTokens: number;
  outputTokens: number;
  derivedCost: number | null;
  uncosted?: boolean;
  calls?: number | null;
};

export type EconomicsCostRow = {
  date: string;
  provider: string;
  amountUsd: number;
};

export type EconomicsGroup = {
  key: string;
  calls: number | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  derivedCostUsd: number | null;
  uncosted: boolean;
  costPerCallUsd: number | null;
  costPerMillionTokensUsd: number | null;
};

export type UsageEconomics = {
  coverage: { start: string | null; end: string | null; observedDays: number; expectedDays: number | null; complete: boolean | null };
  totals: EconomicsGroup;
  reportedCostUsd: number | null;
  derivedCostUsd: number | null;
  reconciliation: { deltaUsd: number | null; agrees: boolean | null };
  byProvider: EconomicsGroup[];
  byModel: EconomicsGroup[];
  byTeam: EconomicsGroup[];
  previous: { reportedCostUsd: number | null; derivedCostUsd: number | null } | null;
  deltas: { reportedPct: number | null; derivedPct: number | null };
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UNATTRIBUTED = "__unattributed__";
const finiteNonNegative = (value: number): boolean => Number.isFinite(value) && value >= 0;

function validateDate(date: string): void {
  if (!DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new Error("Economics dates must be valid UTC dates");
}
function validateUsage(row: EconomicsUsageRow): void {
  validateDate(row.date);
  if (!row.provider || !row.model || !finiteNonNegative(row.inputTokens) || !finiteNonNegative(row.outputTokens) || (row.derivedCost !== null && !finiteNonNegative(row.derivedCost)) || (row.calls !== undefined && row.calls !== null && (!Number.isInteger(row.calls) || !finiteNonNegative(row.calls)))) throw new Error("Invalid usage economics row");
}
function validateCost(row: EconomicsCostRow): void {
  validateDate(row.date);
  if (!row.provider || !finiteNonNegative(row.amountUsd)) throw new Error("Invalid reported cost row");
}
function pctChange(current: number | null, previous: number | null): number | null {
  return current === null || previous === null || previous === 0 ? null : (current - previous) / previous;
}
function metric(key: string, rows: EconomicsUsageRow[]): EconomicsGroup {
  const inputTokens = rows.reduce((sum, row) => sum + row.inputTokens, 0);
  const outputTokens = rows.reduce((sum, row) => sum + row.outputTokens, 0);
  const costed = rows.filter((row) => !row.uncosted && row.derivedCost !== null);
  const derivedCostUsd = costed.length === rows.length ? costed.reduce((sum, row) => sum + (row.derivedCost ?? 0), 0) : null;
  const calls = rows.every((row) => row.calls !== undefined && row.calls !== null) ? rows.reduce((sum, row) => sum + (row.calls ?? 0), 0) : null;
  const totalTokens = inputTokens + outputTokens;
  return { key, calls, inputTokens, outputTokens, totalTokens, derivedCostUsd, uncosted: costed.length !== rows.length, costPerCallUsd: derivedCostUsd !== null && calls && calls > 0 ? derivedCostUsd / calls : null, costPerMillionTokensUsd: derivedCostUsd !== null && totalTokens > 0 ? derivedCostUsd / totalTokens * 1_000_000 : null };
}
function grouped(rows: EconomicsUsageRow[], keyOf: (row: EconomicsUsageRow) => string): EconomicsGroup[] {
  const groups = new Map<string, EconomicsUsageRow[]>();
  for (const row of rows) groups.set(keyOf(row), [...(groups.get(keyOf(row)) ?? []), row]);
  return [...groups.entries()].map(([key, values]) => metric(key, values)).sort((a, b) => (b.derivedCostUsd ?? 0) - (a.derivedCostUsd ?? 0));
}

export function buildUsageEconomics(input: {
  usage: EconomicsUsageRow[];
  reportedCosts?: EconomicsCostRow[];
  previous?: { reportedCostUsd?: number | null; derivedCostUsd?: number | null };
  expectedDays?: number;
  fxRate?: number | null;
}): UsageEconomics {
  input.usage.forEach(validateUsage);
  (input.reportedCosts ?? []).forEach(validateCost);
  const dates = [...new Set(input.usage.map((row) => row.date))].sort();
  const providers = grouped(input.usage, (row) => row.provider);
  const models = grouped(input.usage, (row) => `${row.provider}:${row.model}`);
  const teams = grouped(input.usage, (row) => row.teamId ?? UNATTRIBUTED);
  const totals = metric("total", input.usage);
  const reportedCostUsd = input.reportedCosts ? input.reportedCosts.reduce((sum, row) => sum + row.amountUsd, 0) : null;
  const deltaUsd = reportedCostUsd === null || totals.derivedCostUsd === null ? null : totals.derivedCostUsd - reportedCostUsd;
  const previous = input.previous ? { reportedCostUsd: input.previous.reportedCostUsd ?? null, derivedCostUsd: input.previous.derivedCostUsd ?? null } : null;
  return {
    coverage: { start: dates[0] ?? null, end: dates.at(-1) ?? null, observedDays: dates.length, expectedDays: input.expectedDays ?? null, complete: input.expectedDays === undefined ? null : dates.length >= input.expectedDays },
    totals,
    reportedCostUsd,
    derivedCostUsd: totals.derivedCostUsd,
    reconciliation: { deltaUsd, agrees: deltaUsd === null ? null : Math.abs(deltaUsd) <= Math.max(0.5, Math.abs(reportedCostUsd ?? 0) * 0.05) },
    byProvider: providers,
    byModel: models,
    byTeam: teams,
    previous,
    deltas: { reportedPct: pctChange(reportedCostUsd, previous?.reportedCostUsd ?? null), derivedPct: pctChange(totals.derivedCostUsd, previous?.derivedCostUsd ?? null) },
  };
}

export function convertEconomicsCost(amountUsd: number | null, frozenFxRate: number | null): number | null {
  return amountUsd === null || frozenFxRate === null || !finiteNonNegative(frozenFxRate) ? null : amountUsd * frozenFxRate;
}
