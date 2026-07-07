// Denarius — seats-vs-roster waste detection (pure, no I/O). The one waste
// signal that needs no extra connector (issue #22): a subscription paying for
// more seats than the roster has people is provably over-provisioned, and the
// excess × seat price is an honest monthly savings ESTIMATE. Secondary by
// design (backend spec §5): rendered in the calm Observations footer, ordered
// below every budget item, never emailed. True idle-seat detection (who uses
// a seat, not just who owns one) arrives with the Copilot connector (v1.5) —
// the footer copy says so.

import type { SeatSubscription } from "@/lib/engine/accrual";
import { money } from "@/lib/money";

/** Secondary stays secondary: at most this many seat findings per render. */
export const MAX_SEAT_WASTE = 3;

const copy = {
  companyWide: (tool: string, seats: number, people: number, excess: number, savings: string) =>
    `${tool}: ${seats} assentos pagos para ${people} pessoas no roster — ${excess} sem dono, ≈ ${savings}/mês.`,
  teamBound: (tool: string, team: string, seats: number, people: number, excess: number, savings: string) =>
    `${tool} (${team}): ${seats} assentos pagos para ${people} pessoas no roster — ${excess} sem dono, ≈ ${savings}/mês.`,
};

export type SeatWasteFinding = {
  /** Stable render key (subscription id). */
  id: string;
  tool: string;
  excessSeats: number;
  /** excess × unit price, display currency — an estimate, phrased as one. */
  monthlySavings: number;
  text: string;
};

export type SeatWasteInput = {
  currency: string;
  subscriptions: SeatSubscription[];
  /** Roster headcount per team id. */
  peopleByTeam: ReadonlyMap<string, number>;
  /** Whole-roster headcount — the denominator for shared subscriptions. */
  totalPeople: number;
};

/** Round to whole cents so the sort key and any downstream sum reconcile to
 *  the cent — the same discipline attributeSeats() uses (invariant #3). */
function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * One finding per over-provisioned subscription, largest savings first,
 * capped at MAX_SEAT_WASTE. A team-bound subscription compares against that
 * team's people; a shared one against the whole roster. No people on the
 * relevant roster slice → no claim (an empty roster proves nothing about
 * seats — show the gap, never a guess).
 */
export function buildSeatWaste(input: SeatWasteInput): SeatWasteFinding[] {
  const findings: SeatWasteFinding[] = [];

  for (const sub of input.subscriptions) {
    const people =
      sub.teamId !== null
        ? (input.peopleByTeam.get(sub.teamId) ?? 0)
        : input.totalPeople;
    if (people <= 0) continue;

    const excess = sub.seatCount - people;
    if (excess <= 0) continue;

    const savings = roundCents(excess * sub.unitPrice);
    const formatted = money(savings, input.currency);
    findings.push({
      id: sub.id,
      tool: sub.tool,
      excessSeats: excess,
      monthlySavings: savings,
      text:
        sub.teamId !== null
          ? copy.teamBound(
              sub.tool,
              sub.teamName ?? "—",
              sub.seatCount,
              people,
              excess,
              formatted,
            )
          : copy.companyWide(sub.tool, sub.seatCount, people, excess, formatted),
    });
  }

  return findings
    .sort((a, b) => b.monthlySavings - a.monthlySavings)
    .slice(0, MAX_SEAT_WASTE);
}
