// Denarius engine — seat-cost daily accrual + team attribution (pure, no I/O).
//
// Manual seat subscriptions are a monthly cost, but counting the full invoice
// on day one would spike the run-rate and distort pacing. So the cost accrues
// linearly: each elapsed day contributes (monthly_total / days_in_period).
// This is THE HERO's seat-accrual rule (PRD §build order 4, invariant #5 sibling).

export type PeriodProgress = {
  dayOfPeriod: number;
  daysInPeriod: number;
};

/**
 * Cost accrued so far this period for one subscription.
 * monthly_total = seatCount × unitPrice; accrued = monthly_total × elapsed_fraction.
 * No day-one spike: day 1 of 30 on a 3000 subscription accrues 100, not 3000.
 */
export function seatAccrual(
  params: { seatCount: number; unitPrice: number } & PeriodProgress,
): number {
  const { seatCount, unitPrice, dayOfPeriod, daysInPeriod } = params;
  if (daysInPeriod <= 0) return 0;
  const monthlyTotal = seatCount * unitPrice;
  // Clamp: a subscription can't accrue negatively nor beyond its full month.
  const elapsed = Math.max(0, Math.min(dayOfPeriod, daysInPeriod));
  return (monthlyTotal / daysInPeriod) * elapsed;
}

export type SeatSubscription = {
  id: string;
  tool: string;
  seatCount: number;
  unitPrice: number;
  /** null = shared / company-wide → Unattributed bucket. */
  teamId: string | null;
  teamName: string | null;
};

export type TeamSpend = { teamId: string; teamName: string; accrued: number };

export type AttributionBreakdown = {
  teams: TeamSpend[]; // sorted desc by accrued
  unattributed: number;
  orgTotal: number;
};

/** Round to whole cents so displayed parts always sum to the displayed total. */
function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Attributes accrued seat cost by team, with a first-class Unattributed bucket
 * for shared/company-wide subscriptions. The reconciliation invariant holds by
 * construction: orgTotal is DEFINED as Σ team_totals + unattributed — spend can
 * never silently disappear. Parts are rounded to cents and the total is summed
 * in integer cents, so the on-screen numbers reconcile to the cent, always.
 */
export function attributeSeats(
  subscriptions: SeatSubscription[],
  period: PeriodProgress,
): AttributionBreakdown {
  const byTeam = new Map<string, TeamSpend>();
  let unattributed = 0;

  for (const sub of subscriptions) {
    const accrued = seatAccrual({
      seatCount: sub.seatCount,
      unitPrice: sub.unitPrice,
      dayOfPeriod: period.dayOfPeriod,
      daysInPeriod: period.daysInPeriod,
    });
    if (sub.teamId === null) {
      unattributed += accrued;
      continue;
    }
    const existing = byTeam.get(sub.teamId);
    if (existing) {
      existing.accrued += accrued;
    } else {
      byTeam.set(sub.teamId, {
        teamId: sub.teamId,
        teamName: sub.teamName ?? "—",
        accrued,
      });
    }
  }

  const teams = [...byTeam.values()]
    .map((team) => ({ ...team, accrued: roundCents(team.accrued) }))
    .sort((a, b) => b.accrued - a.accrued);
  const roundedUnattributed = roundCents(unattributed);
  const totalCents =
    teams.reduce((sum, t) => sum + Math.round(t.accrued * 100), 0) +
    Math.round(roundedUnattributed * 100);
  return {
    teams,
    unattributed: roundedUnattributed,
    orgTotal: totalCents / 100,
  };
}
