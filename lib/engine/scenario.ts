// Denarius engine — scenario simulation (pure, no I/O). The v1 what-if lever
// (PRD story 36, deliberately single-variable and linear): change ONE team's
// remaining pace by a fraction and see where the org closes. Spend already on
// the books can't be undone, so the lever scales only the REMAINING projected
// spend (projection − spent) — never the past.
//
// Runs client-side in the drawer over engine aggregates already on screen —
// no LLM, no backend round-trip. Estimates, disclosed as such; the system
// points, the CEO decides.

export type ScenarioInput = {
  org: { budget: number; projection: number };
  team: { spent: number; projection: number };
};

export type ScenarioResult = {
  /** The team's simulated close: spent + remaining × (1 + paceDelta). */
  teamClose: number;
  /** The org's simulated close: the team's change flows 1:1 into the org. */
  orgClose: number;
  /** orgBudget − orgClose — the headline the drawer answers with. */
  orgMargin: number;
  withinBudget: boolean;
};

/** The team's remaining projected spend — the only thing the lever can move. */
function remainingOf(input: ScenarioInput): number {
  return Math.max(0, input.team.projection - input.team.spent);
}

/**
 * Simulates a pace change. `paceDelta` ∈ [−1, 1]: −0.3 = the team slows its
 * remaining pace by 30%; −1 = stops entirely; +0.5 = accelerates 50%.
 * Values are clamped so a scenario can never "unspend" money.
 */
export function simulatePace(
  input: ScenarioInput,
  paceDelta: number,
): ScenarioResult {
  const delta = Math.max(-1, Math.min(1, paceDelta));
  const remaining = remainingOf(input);
  const teamClose = input.team.spent + remaining * (1 + delta);
  const orgClose = input.org.projection + remaining * delta;
  const orgMargin = input.org.budget - orgClose;
  return { teamClose, orgClose, orgMargin, withinBudget: orgMargin >= 0 };
}

export type BreakEven = {
  /** Pace delta that closes the org exactly on budget, clamped to [−1, 0].
   *  null when the team has no remaining spend to lever. */
  delta: number | null;
  /** False when even stopping the team entirely (−100%) still closes over —
   *  the drawer discloses that instead of pretending the preset works. */
  reachable: boolean;
};

/** The "fechar no orçamento" preset: how much this team must slow. */
export function breakEvenDelta(input: ScenarioInput): BreakEven {
  const gap = input.org.projection - input.org.budget;
  if (gap <= 0) return { delta: 0, reachable: true }; // already closes within

  const remaining = remainingOf(input);
  if (remaining <= 0) return { delta: null, reachable: false };

  const raw = -gap / remaining;
  return { delta: Math.max(-1, raw), reachable: raw >= -1 };
}
