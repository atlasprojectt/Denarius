// Denarius engine — the Home cockpit view model (pure, no I/O). Assembles the
// one-screen answer to "am I in control?" from already-fetched raw parts: it
// combines seats + API into display-currency spend (invariant #4, frozen FX),
// evaluates each budget, resolves the verdict, builds the per-team findings, and
// partitions teams into "needs attention" (status ≠ green, ordered by projected
// risk) vs "under control" (green). The React layer only renders what this
// returns — no business logic in components (architecture §9).

import { buildBudgetThresholdFinding, orderFindings, type BudgetThresholdFinding } from "@/lib/findings/budget-threshold";
import type { PeriodProgress } from "./accrual";
import { combinedSpend, evaluateBudget, type BudgetEvaluation } from "./budget";
import { computeVerdict, type Verdict, type VerdictStatus } from "./verdict";

/** Raw spend parts for one scope, before the seats+API combine. */
export type ScopeSpend = {
  /** Budget amount in the display currency. */
  budget: number;
  /** Seat accrual to date, already in the display currency. */
  seatDisplay: number;
  /** API cost to date in USD (source of truth). */
  apiUsd: number;
  /** USD→display frozen at period start; null when capture failed. */
  fxRate: number | null;
};

export type CockpitTeamInput = ScopeSpend & {
  teamId: string;
  teamName: string;
  thresholds: number[];
};

export type CockpitInput = {
  period: PeriodProgress;
  currency: string;
  /** e.g. "31 de julho" — the period close, for the amber verdict sentence. */
  periodEndLabel: string;
  /** null → cold start: no org budget, so there is no verdict to give. */
  org: (ScopeSpend & { thresholds: number[] }) | null;
  teams: CockpitTeamInput[];
  /** Provider-reported cost (USD) for the "where the money goes" list. */
  composition: { provider: string; usd: number }[];
};

/** The configured sub-100% warn threshold as a whole percent (default 80). */
export function warnPctFromThresholds(thresholds: number[]): number {
  const warns = thresholds.filter((t) => t > 0 && t < 1);
  const highest = warns.length > 0 ? Math.max(...warns) : 0.8;
  return Math.round(highest * 100);
}

export type CockpitTeam = {
  teamId: string;
  teamName: string;
  evaluation: BudgetEvaluation;
  /** Projection as a fraction of budget (1 = on budget), null while collecting. */
  pctProjected: number | null;
  /** null when the team is under control (green); the row is calm. */
  finding: BudgetThresholdFinding | null;
  /** Budget status for the pill/bar color: red only for a realized breach. */
  status: VerdictStatus;
  /** Configured warn threshold (whole percent) — prefills the inline edit modal. */
  warnPct: number;
};

export type CompositionEntry = {
  /** provider key ("openai" | "anthropic") or "seats" for the manual-seat slice. */
  key: string;
  label: string;
  /** Amount in the display currency. */
  amount: number;
  /** amount ÷ total (0..1). */
  share: number;
};

export type Cockpit =
  | { state: "cold-start" }
  | {
      state: "ready";
      verdict: Verdict;
      collecting: boolean;
      org: BudgetEvaluation;
      /** Org projection as a fraction of budget (1 = on budget), null while collecting. */
      orgPctProjected: number | null;
      /** Configured org warn threshold (whole percent) — prefills the hero edit modal. */
      orgWarnPct: number;
      /** API USD that couldn't be converted (FX missing) — disclosed, never guessed. */
      orgUnconvertedUsd: number;
      needsAttention: CockpitTeam[];
      underControl: CockpitTeam[];
      composition: CompositionEntry[];
      /** True when nothing needs attention and the verdict is green — the affirmative state. */
      allClear: boolean;
      currency: string;
      periodEndLabel: string;
    };

const PROVIDER_LABEL: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

function pctProjectedOf(evaluation: BudgetEvaluation): number | null {
  return evaluation.projection !== null && evaluation.budget > 0
    ? evaluation.projection / evaluation.budget
    : null;
}

/** Evaluate one scope: combine seats + API (frozen FX) then measure vs budget.
 *  Exported so the notification path (#20) evaluates the same way the home does. */
export function evaluateScope(
  scope: ScopeSpend,
  period: PeriodProgress,
): { evaluation: BudgetEvaluation; unconvertedUsd: number } {
  const combined = combinedSpend({
    seatDisplay: scope.seatDisplay,
    apiUsd: scope.apiUsd,
    fxRate: scope.fxRate,
  });
  return {
    evaluation: evaluateBudget({ budget: scope.budget, spent: combined.display, period }),
    unconvertedUsd: combined.unconvertedUsd,
  };
}

/**
 * "Where the money goes": manual seats (display) plus each provider's reported
 * API cost converted at the org frozen FX. When the rate is missing, the API
 * cost can't be honestly converted into the display currency, so it is dropped
 * from the ranked list (its absence is disclosed by the hero's unconverted-USD
 * note) rather than mixing USD and BRL into one bar (invariant #3/#4).
 */
function buildComposition(
  seatDisplay: number,
  providers: { provider: string; usd: number }[],
  fxRate: number | null,
): CompositionEntry[] {
  const entries: CompositionEntry[] = [];
  if (seatDisplay > 0) {
    entries.push({ key: "seats", label: "Assentos", amount: seatDisplay, share: 0 });
  }
  if (fxRate !== null) {
    for (const p of providers) {
      const amount = p.usd * fxRate;
      if (amount > 0) {
        entries.push({
          key: p.provider,
          label: PROVIDER_LABEL[p.provider] ?? p.provider,
          amount,
          share: 0,
        });
      }
    }
  }
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  return entries
    .map((e) => ({ ...e, share: total > 0 ? e.amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

/** Assembles the full Home cockpit from raw parts. Pure — the hero function. */
export function buildCockpit(input: CockpitInput): Cockpit {
  if (input.org === null) return { state: "cold-start" };

  const { period, currency, periodEndLabel } = input;
  const { evaluation: org, unconvertedUsd: orgUnconvertedUsd } = evaluateScope(input.org, period);

  const teams: CockpitTeam[] = input.teams.map((t) => {
    const { evaluation } = evaluateScope(t, period);
    const finding = buildBudgetThresholdFinding({
      scope: "team",
      targetId: t.teamId,
      targetName: t.teamName,
      evaluation,
      thresholds: t.thresholds,
      currency,
    });
    const status: VerdictStatus =
      finding === null ? "green" : finding.level === "breach" ? "red" : "amber";
    return {
      teamId: t.teamId,
      teamName: t.teamName,
      evaluation,
      pctProjected: pctProjectedOf(evaluation),
      finding,
      status,
      warnPct: warnPctFromThresholds(t.thresholds),
    };
  });

  const verdict = computeVerdict({
    org,
    teams: teams.map((t) => ({ name: t.teamName, evaluation: t.evaluation })),
    currency,
    periodEndLabel,
  });

  // Needs-attention teams carry a finding; order them by the same budget-impact
  // rule as the alerts (most severe first, then largest overrun).
  const flagged = teams.filter((t) => t.finding !== null);
  const orderedFindings = orderFindings(flagged.map((t) => t.finding as BudgetThresholdFinding));
  const byId = new Map(flagged.map((t) => [t.finding!.targetId, t]));
  const needsAttention = orderedFindings.map((f) => byId.get(f.targetId) as CockpitTeam);

  const underControl = teams
    .filter((t) => t.finding === null)
    .sort((a, b) => b.evaluation.pctSpent - a.evaluation.pctSpent);

  return {
    state: "ready",
    verdict,
    collecting: org.collecting,
    org,
    orgPctProjected: pctProjectedOf(org),
    orgWarnPct: warnPctFromThresholds(input.org.thresholds),
    orgUnconvertedUsd,
    needsAttention,
    underControl,
    composition: buildComposition(input.org.seatDisplay, input.composition, input.org.fxRate),
    allClear: needsAttention.length === 0 && verdict.status === "green",
    currency,
    periodEndLabel,
  };
}
