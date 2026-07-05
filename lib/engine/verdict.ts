// Denarius engine — the verdict (pure, no I/O). THE product's headline output:
// one deterministic sentence + a status color that answers "am I in control?"
// in a single glance (PRD P15). The CEO reads a conclusion, not ingredients.
//
// Semaphore discipline (product principle #5): green/amber/red are reserved for
// budget status. "collecting" is a NEUTRAL fourth state (before day 5, no
// projection yet) — not a color, so it never reads as a judgement on spend.
//
// The sentence is assembled from templates with engine numbers injected; no LLM
// is involved (invariant #2). money()/percent() format — deterministic display,
// not computation.

import { percent } from "@/lib/format";
import { money } from "@/lib/money";

import { PROJECTION_GUARD_DAY, type BudgetEvaluation } from "./budget";

export type VerdictStatus = "green" | "amber" | "red" | "collecting";

export type Verdict = { status: VerdictStatus; sentence: string };

export type VerdictTeam = {
  name: string;
  evaluation: BudgetEvaluation;
};

export type VerdictInput = {
  org: BudgetEvaluation;
  teams: VerdictTeam[];
  currency: string;
  /** e.g. "30 de junho" — the period close, for the amber sentence. */
  periodEndLabel: string;
};

/**
 * Resolves the verdict:
 *   collecting — before day 5, no projection to judge against ("collecting pace…")
 *   red        — a team (or the org) has ALREADY breached its budget
 *   amber      — nothing breached yet, but the org is projected to close over
 *   green      — projected to close within budget
 * Priority is severity order: a realized breach outranks a projected one.
 */
export function computeVerdict(input: VerdictInput): Verdict {
  const { org, teams, currency, periodEndLabel } = input;

  if (org.collecting) {
    return {
      status: "collecting",
      sentence: `Coletando ritmo — a projeção de fechamento aparece a partir do dia ${PROJECTION_GUARD_DAY} do período.`,
    };
  }

  // RED: something has actually crossed its budget. Prefer to name the worst
  // breached TEAM (the actionable owner); fall back to the org.
  const breachedTeams = teams
    .filter((t) => t.evaluation.breached)
    .sort((a, b) => b.evaluation.pctSpent - a.evaluation.pctSpent);

  if (breachedTeams.length > 0 || org.breached) {
    const orgPct = percent(org.projection !== null ? org.projection / org.budget : org.pctSpent);
    if (breachedTeams.length > 0) {
      return {
        status: "red",
        sentence: `Fora do orçamento — ${breachedTeams[0].name} estourou o limite; a empresa projeta ${orgPct} do orçamento.`,
      };
    }
    return {
      status: "red",
      sentence: `Fora do orçamento — a empresa já passou o limite do período (${percent(org.pctSpent)}).`,
    };
  }

  // AMBER: the org run-rate closes over budget (projection guaranteed non-null
  // here — the collecting branch already returned).
  if (org.projectedBreach && org.projectedMargin !== null) {
    const over = money(-org.projectedMargin, currency);
    return {
      status: "amber",
      sentence: `Atenção — no ritmo atual, ${over} acima do orçamento em ${periodEndLabel}.`,
    };
  }

  // GREEN: projected to close within budget.
  const under = money(org.projectedMargin ?? 0, currency);
  return {
    status: "green",
    sentence: `No controle — projeção de fechar ${under} abaixo do orçamento.`,
  };
}
