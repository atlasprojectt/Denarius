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

export type Verdict = {
  status: VerdictStatus;
  sentence: string;
  /** The breached team the red sentence names (same tie-break as the sentence);
   *  null in every other state — the UI's "Ver time" action hangs off this so it
   *  can never point at a different team than the one named. */
  teamId: string | null;
};

export type VerdictTeam = {
  teamId: string;
  name: string;
  evaluation: BudgetEvaluation;
};

export type VerdictInput = {
  org: BudgetEvaluation;
  teams: VerdictTeam[];
  currency: string;
};

/** The breach clause: "ultrapassou o orçamento em X%" with enough precision
 *  that a real overrun never reads as zero (0 → 1 → 2 decimals). breached
 *  includes spent === budget, so an overrun below display granularity says
 *  "atingiu o limite" instead of claiming a zero overrun (principle #3). */
function breachClause(fraction: number): string {
  for (const digits of [0, 1, 2]) {
    if (Math.round(fraction * 100 * 10 ** digits) > 0) {
      return `ultrapassou o orçamento em ${percent(fraction, digits)}`;
    }
  }
  return "atingiu o limite do orçamento";
}

/**
 * Resolves the verdict:
 *   collecting — before day 5, no projection to judge against ("collecting pace…")
 *   red        — a team (or the org) has ALREADY breached its budget
 *   amber      — nothing breached yet, but the org is projected to close over
 *   green      — projected to close within budget
 * Priority is severity order: a realized breach outranks a projected one.
 */
export function computeVerdict(input: VerdictInput): Verdict {
  const { org, teams, currency } = input;

  if (org.collecting) {
    return {
      status: "collecting",
      sentence: `Coletando ritmo — projeção disponível a partir do dia ${PROJECTION_GUARD_DAY}.`,
      teamId: null,
    };
  }

  // RED: something has actually crossed its budget. Prefer to name the worst
  // breached TEAM (the actionable owner) and ITS overrun — the org projection
  // lives one glance below, in the hero; fall back to the org.
  const breachedTeams = teams
    .filter((t) => t.evaluation.breached)
    .sort((a, b) => b.evaluation.pctSpent - a.evaluation.pctSpent);

  if (breachedTeams.length > 0) {
    const worst = breachedTeams[0];
    return {
      status: "red",
      sentence: `${worst.name} ${breachClause(worst.evaluation.pctSpent - 1)}.`,
      teamId: worst.teamId,
    };
  }
  if (org.breached) {
    return {
      status: "red",
      sentence: `A empresa ${breachClause(org.pctSpent - 1)}.`,
      teamId: null,
    };
  }

  // AMBER: the org run-rate closes over budget (projection guaranteed non-null
  // here — the collecting branch already returned).
  if (org.projectedBreach && org.projectedMargin !== null) {
    const over = money(-org.projectedMargin, currency);
    return {
      status: "amber",
      sentence: `Atenção — projeção de ${over} acima do orçamento.`,
      teamId: null,
    };
  }

  // GREEN: projected to close within budget.
  const under = money(org.projectedMargin ?? 0, currency);
  return {
    status: "green",
    sentence: `No controle — projeção ${under} abaixo do orçamento.`,
    teamId: null,
  };
}
