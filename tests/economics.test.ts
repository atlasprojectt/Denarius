import { describe, expect, it } from "vitest";
import { buildUsageEconomics, convertEconomicsCost, type EconomicsUsageRow } from "@/lib/engine/economics";

const usage: EconomicsUsageRow[] = [
  { date: "2026-08-01", provider: "openai", model: "gpt-a", teamId: "team-a", inputTokens: 800, outputTokens: 200, derivedCost: 2, calls: 10 },
  { date: "2026-08-02", provider: "anthropic", model: "claude-a", teamId: null, inputTokens: 1500, outputTokens: 500, derivedCost: 3, calls: 5 },
];

describe("usage economics", () => {
  it("calculates only observed, defensible totals", () => {
    const result = buildUsageEconomics({ usage, reportedCosts: [{ date: "2026-08-01", provider: "openai", amountUsd: 5 }], expectedDays: 31 });
    expect(result.totals).toMatchObject({ calls: 15, inputTokens: 2300, outputTokens: 700, totalTokens: 3000, derivedCostUsd: 5 });
    expect(result.totals.costPerCallUsd).toBeCloseTo(1 / 3);
    expect(result.totals.costPerMillionTokensUsd).toBeCloseTo(1666.6667);
    expect(result.coverage).toMatchObject({ observedDays: 2, complete: false });
    expect(result.reconciliation.agrees).toBe(true);
  });

  it("groups by provider, model and preserves Unattributed", () => {
    const result = buildUsageEconomics({ usage });
    expect(result.byProvider.map((row) => row.key)).toEqual(["anthropic", "openai"]);
    expect(result.byModel.map((row) => row.key)).toEqual(["anthropic:claude-a", "openai:gpt-a"]);
    expect(result.byTeam.some((row) => row.key === "__unattributed__")).toBe(true);
  });

  it("keeps token volume but marks cost metrics unavailable for uncosted usage", () => {
    const result = buildUsageEconomics({ usage: [{ ...usage[0], derivedCost: null, uncosted: true }] });
    expect(result.totals.totalTokens).toBe(1000);
    expect(result.derivedCostUsd).toBeNull();
    expect(result.totals.costPerMillionTokensUsd).toBeNull();
  });

  it("does not invent calls when the source lacks request counts", () => {
    const result = buildUsageEconomics({ usage: usage.map((row) => ({ ...row, calls: undefined })) });
    expect(result.totals.calls).toBeNull();
    expect(result.totals.costPerCallUsd).toBeNull();
  });

  it("returns unavailable deltas for missing and zero comparison bases", () => {
    expect(buildUsageEconomics({ usage }).deltas.reportedPct).toBeNull();
    expect(buildUsageEconomics({ usage, reportedCosts: [], previous: { reportedCostUsd: 0, derivedCostUsd: 0 } }).deltas).toEqual({ reportedPct: null, derivedPct: null });
  });

  it("keeps currency conversion explicit and frozen-rate dependent", () => {
    expect(convertEconomicsCost(10, null)).toBeNull();
    expect(convertEconomicsCost(10, 5)).toBe(50);
  });

  it("rejects invalid facts", () => {
    expect(() => buildUsageEconomics({ usage: [{ ...usage[0], inputTokens: -1 }] })).toThrow();
    expect(() => buildUsageEconomics({ usage: [{ ...usage[0], date: "invalid" }] })).toThrow();
  });

  it("is deterministic", () => {
    const input = { usage, reportedCosts: [{ date: "2026-08-01", provider: "openai", amountUsd: 5 }] };
    const first = buildUsageEconomics(input);
    const second = buildUsageEconomics(input);
    expect(first).toEqual(second);
  });
});
