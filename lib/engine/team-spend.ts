// Denarius engine — per-team combined spend in the display currency (pure,
// no I/O). Seats accrue in the display currency; API cost is USD converted at
// the org's frozen FX rate (invariant #4). Shared by the notification snapshot
// (#20) and the home's apontamentos (#21) so the "who spends what" list can
// never drift between email and screen.

import type { DriverInput } from "./drivers";

export type TeamSpendInput = {
  teams: { id: string; name: string }[];
  /** Seat accrual to date by team, display currency. */
  seatByTeam: ReadonlyMap<string, number>;
  /** Derived API cost to date by team, USD. */
  apiUsdByTeam: ReadonlyMap<string, number>;
  seatUnattributed: number;
  apiUnattributedUsd: number;
  /** USD → display, frozen at period start; null when capture failed. */
  fxRate: number | null;
};

export type TeamSpendMix = {
  /** One entry per team, display currency. Includes zero-spend teams (callers
   *  filter; topDrivers drops non-positive values anyway). */
  teamDrivers: DriverInput[];
  /** Shared/unmapped spend, display currency — the first-class bucket. */
  unattributed: number;
};

/**
 * Combines seats + API per team. Returns null when the FX rate is missing —
 * USD and the display currency can't be honestly summed, so callers show
 * nothing rather than a dishonest mix (invariant #3).
 */
export function combineTeamSpend(input: TeamSpendInput): TeamSpendMix | null {
  if (input.fxRate === null) return null;
  const fx = input.fxRate;

  return {
    teamDrivers: input.teams.map((t) => ({
      label: t.name,
      value:
        (input.seatByTeam.get(t.id) ?? 0) +
        (input.apiUsdByTeam.get(t.id) ?? 0) * fx,
    })),
    unattributed: input.seatUnattributed + input.apiUnattributedUsd * fx,
  };
}
