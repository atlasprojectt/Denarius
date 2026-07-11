// Denarius engine — scenario simulation (pure, no I/O). The v1 what-if lever
// (PRD story 36, deliberately single-variable and linear): change ONE team's
// remaining pace by a fraction and see where the TEAM and the COMPANY close —
// two separate outcomes, each against its own budget (2026-07-11 audit,
// QA-04: a positive company close must never read as a healthy team). Spend
// already on the books can't be undone, so the lever scales only the
// REMAINING projected spend (projection − spent) — never the past.
//
// Runs client-side in the drawer over engine aggregates already on screen —
// no LLM, no backend round-trip. Estimates, disclosed as such; the system
// points, the CEO decides.

export type ScenarioInput = {
  org: { budget: number; projection: number };
  team: { budget: number; spent: number; projection: number };
};

/** One scope's simulated close measured against its OWN budget. */
export type ScopeOutcome = {
  close: number;
  /** budget − close: positive = inside the budget. */
  margin: number;
  withinBudget: boolean;
};

export type ScenarioResult = {
  team: ScopeOutcome;
  org: ScopeOutcome;
};

/** The team's remaining projected spend — the only thing the lever can move. */
function remainingOf(input: ScenarioInput): number {
  return Math.max(0, input.team.projection - input.team.spent);
}

function outcome(close: number, budget: number): ScopeOutcome {
  const margin = budget - close;
  return { close, margin, withinBudget: margin >= 0 };
}

/**
 * Simulates a pace change. `paceDelta` ∈ [−1, 1]: −0.3 = the team slows its
 * remaining pace by 30%; −1 = stops entirely; +0.5 = accelerates 50%.
 * Values are clamped so a scenario can never "unspend" money. The team's
 * change flows 1:1 into the org close; each scope is judged against its own
 * budget, independently.
 */
export function simulatePace(
  input: ScenarioInput,
  paceDelta: number,
): ScenarioResult {
  const delta = Math.max(-1, Math.min(1, paceDelta));
  const remaining = remainingOf(input);
  const teamClose = input.team.spent + remaining * (1 + delta);
  const orgClose = input.org.projection + remaining * delta;
  return {
    team: outcome(teamClose, input.team.budget),
    org: outcome(orgClose, input.org.budget),
  };
}

export type BreakEven = {
  /** Pace delta that closes the TEAM exactly on its own budget, clamped to
   *  [−1, 0]. 0 when the team already projects inside its budget. null when
   *  the team has no remaining spend to lever. */
  delta: number | null;
  /** False when even stopping the team entirely (−100%) still closes it over
   *  its own budget — already-spent cost can't be undone. The drawer
   *  discloses that instead of pretending the preset works. */
  reachable: boolean;
};

/**
 * The "fechar no orçamento" preset: how much THIS team must slow its remaining
 * pace to close on ITS OWN budget (QA-10 — the old version targeted the org
 * budget, so the preset did nothing whenever the company already closed
 * inside, even with the team far over its own limit).
 * teamClose(δ) = spent + remaining × (1 + δ) = teamBudget
 * ⇒ δ = (teamBudget − projection) / remaining.
 */
export function breakEvenDelta(input: ScenarioInput): BreakEven {
  const gap = input.team.projection - input.team.budget;
  if (gap <= 0) return { delta: 0, reachable: true }; // already closes within

  const remaining = remainingOf(input);
  if (remaining <= 0) return { delta: null, reachable: false };

  const raw = -gap / remaining;
  // raw < −1 ⇔ spent alone already exceeds the team budget: unreachable.
  return { delta: Math.max(-1, raw), reachable: raw >= -1 };
}
