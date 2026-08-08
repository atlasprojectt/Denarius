// Denarius engine — the period snapshot (pure, no I/O). Issue #94 (closed
// months), widened by #96 to the month that is still running.
//
// WHY FREEZE RATHER THAN RECOMPUTE. `subscription` has no period column: seat
// count and unit price are current state, mutated in place. A past month
// recomputed today would be priced with today's seat configuration — a past
// that never happened (principle #3, "honest numbers or no numbers"). Everything
// else survives (cost_daily is never deleted, usage_daily only rewrites the
// current-month slice, budget rows are keyed by period_month), so the seat state
// is the one thing that must be captured WHILE IT IS STILL TRUE. The rest is
// frozen alongside it so a printed month is internally consistent.
//
// This function reimplements no arithmetic: the numbers come from the same
// engine the screens use (buildCockpit / evaluateScope / combineTeamSpend /
// topDrivers / reconcile), fed a period. It carries team aggregates only —
// never a person — so a frozen month can't become the back door around the
// privacy switches.
//
// It is period-agnostic by construction, which is what lets the on-demand
// report (#96) reuse it: hand it `currentPeriod()` with `closed: false` and the
// same assembly describes the month in flight — run-rate projection, day-5
// guard and present-tense verdict all come from the engine, not from here. The
// live report is rendered and thrown away; only closed months are persisted.

import { attributeSeats, type SeatSubscription } from "@/lib/engine/accrual";
import {
  budgetedTeams,
  buildCockpit,
  type CockpitTeamInput,
} from "@/lib/engine/cockpit";
import { topDrivers, type Driver } from "@/lib/engine/drivers";
import { freshness, type ConnectionStatus } from "@/lib/engine/freshness";
import type { FrozenFx } from "@/lib/engine/money-model";
import { monthRange, type Period } from "@/lib/engine/period";
import { reconcile, type Reconciliation } from "@/lib/engine/reconcile";
import { combineTeamSpend } from "@/lib/engine/team-spend";
import type { VerdictStatus } from "@/lib/engine/verdict";

/** How a PERSISTED row came to exist: closed by the daily cron, or
 *  reconstructed later. This is the `period_snapshot.source` domain — nothing
 *  outside these two values is ever written. */
export type PersistedSource = "auto" | "backfill";

/** `live` is the on-demand report (#96): the same assembly over the running
 *  month, rendered and discarded. It never reaches the table. */
export type SnapshotSource = PersistedSource | "live";

/** The seat configuration as it stood when the month was frozen. A backfilled
 *  month has none — seats are then UNAVAILABLE, never zero (a disclosed gap). */
export type SnapshotSeatState =
  | { available: true; subscriptions: SeatSubscription[] }
  | { available: false };

export type PeriodSnapshotInput = {
  /** The month being described — `closedPeriod(year, month)` to freeze one,
   *  `currentPeriod()` for the report of the month in flight. */
  period: Period;
  /** The period has ENDED. Default true (every closing caller). False makes the
   *  cockpit project at run-rate under the day-5 guard, keeps the verdict in the
   *  present tense, and switches staleness to the live connector rule. */
  closed?: boolean;
  currency: string;
  source: SnapshotSource;
  /** ISO instant the snapshot was taken — the close for a frozen month, "now"
   *  for a live report. */
  closedAt: string;
  /** The org budget governing the month, or null (a month may have had none). */
  orgBudget: { amount: number; thresholds: number[] } | null;
  teamBudgets: { teamId: string; amount: number; thresholds: number[] }[];
  /** THE month's frozen FX triple, resolved from that month's budget rows. */
  fx: FrozenFx | null;
  /** Every people team, for the by-team cut (budgeted or not). */
  teams: { id: string; name: string }[];
  seats: SnapshotSeatState;
  /** Token-derived API cost (USD) by team id — the attribution grain. */
  apiUsdByTeam: ReadonlyMap<string, number>;
  /** Derived API cost (USD) that no project_map entry could place. */
  apiUnattributedUsd: number;
  /** Provider-REPORTED cost (USD) by provider — the headline truth. */
  reportedByProvider: { provider: string; usd: number }[];
  /** Σ derived cost, costed models only (USD) — the reconciliation input. */
  derivedUsd: number;
  /** At least one usage bucket carried a model with no price. */
  hasUncosted: boolean;
  /** Connections as they stood, for the stale-sync flag. */
  connections: ConnectionStatus[];
};

export type SnapshotTeam = {
  teamId: string;
  teamName: string;
  /** Combined spend in the display currency; null when FX was missing. */
  spend: number | null;
  /** The team's own budget, or null when the team wasn't budgeted. */
  budget: number | null;
  /** spend ÷ budget; null without both. */
  pctSpent: number | null;
  /** Budget status at close; null when the team wasn't budgeted. */
  status: VerdictStatus | null;
};

export type SnapshotSubscription = {
  tool: string;
  seatCount: number;
  unitPrice: number;
  teamId: string | null;
  teamName: string | null;
  /** seatCount × unitPrice — the full month, since the month is closed. */
  monthlyTotal: number;
};

export type SnapshotSeats = {
  available: boolean;
  /** Full-month seat cost in the display currency; null when unavailable. */
  total: number | null;
  /** Shared/company-wide seat cost; null when unavailable. */
  unattributed: number | null;
  /** The configuration itself — the only copy of this state that will exist. */
  subscriptions: SnapshotSubscription[];
};

export type SnapshotBreakdown = {
  teams: SnapshotTeam[];
  /** Reported cost per provider; `display` is null when FX was missing. */
  providers: { provider: string; usd: number; display: number | null }[];
  /** Top-3 contributors to the month (teams + Unattributed), display currency. */
  topDrivers: Driver[];
  unattributed: {
    apiUsd: number;
    seats: number | null;
    display: number | null;
  };
  seats: SnapshotSeats;
  reconciliation: Reconciliation;
};

export type PeriodSnapshot = {
  /** yyyy-mm-01 — the period key. */
  periodMonth: string;
  monthLabel: string;
  closedAt: string;
  source: SnapshotSource;
  /** Elapsed days including today; equals `daysInPeriod` for a closed month. */
  dayOfPeriod: number;
  daysInPeriod: number;
  currency: string;
  /** Provider-reported API cost for the month (USD, the headline truth). */
  apiUsd: number;
  seatsAmount: number | null;
  /** seats + API×frozen FX; null when either half couldn't be established. */
  combinedAmount: number | null;
  budgetAmount: number | null;
  pctSpent: number | null;
  /** Run-rate close projection, straight from the cockpit — never recomputed
   *  here. Null without an org budget and null before day 5 (invariant #5: no
   *  projection while the month is still collecting pace). A closed month has
   *  fully elapsed, so its projection IS its realized total. */
  projection: number | null;
  frozenFxRate: number | null;
  fxRateSource: string | null;
  fxRateDate: string | null;
  /** null when the month had no org budget — there was no verdict to give. */
  verdictStatus: VerdictStatus | null;
  verdictSentence: string | null;
  breakdown: SnapshotBreakdown;
  /** A month's caveats are frozen WITH its numbers: a report that drops them
   *  claims a certainty the month did not have. */
  hasUncosted: boolean;
  reconciliationOk: boolean;
  fxMissing: boolean;
  staleSync: boolean;
};

const UNATTRIBUTED_LABEL = "Não atribuído";

/**
 * True when a connection may have left spend out of the closed month: it was
 * active (not deliberately revoked) and its last successful sync predates the
 * month's end, so the final days may never have been fetched.
 */
function syncWasStale(connections: ConnectionStatus[], periodEndIso: string): boolean {
  return connections.some(
    (c) =>
      c.status !== "revoked" && (c.lastSyncAt === null || c.lastSyncAt < periodEndIso),
  );
}

/**
 * Describes one period. Pure — the same inputs always produce the same row.
 * Freezes a closed month by default; `closed: false` describes the month in
 * flight for the on-demand report.
 */
export function buildPeriodSnapshot(input: PeriodSnapshotInput): PeriodSnapshot {
  const { period, currency, fx, teams } = input;
  const closed = input.closed ?? true;

  const apiUsd = input.reportedByProvider.reduce((sum, p) => sum + p.usd, 0);
  const apiDerivedUsd =
    [...input.apiUsdByTeam.values()].reduce((sum, v) => sum + v, 0) +
    input.apiUnattributedUsd;

  // FX is only *missing* when there is USD to convert. With no API spend
  // anywhere the conversion is a no-op, so a rate of 1 is exact rather than a
  // guess — a seats-only month reports honest totals without one.
  const fxMissing = fx === null && (apiUsd > 0 || apiDerivedUsd > 0);
  const rate = fx?.rate ?? (fxMissing ? null : 1);

  const seatAttribution = input.seats.available
    ? attributeSeats(input.seats.subscriptions, period)
    : null;
  const seatsAmount = seatAttribution?.orgTotal ?? null;

  const combinedAmount =
    seatsAmount !== null && rate !== null ? seatsAmount + apiUsd * rate : null;

  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const seatByTeam = new Map(
    (seatAttribution?.teams ?? []).map((t) => [t.teamId, t.accrued]),
  );

  // The budgeted picture comes from the SAME assembly the screens use, fed a
  // fully elapsed period — so a frozen verdict can never disagree with the one
  // the cockpit showed on the month's last day.
  const cockpitTeams: CockpitTeamInput[] = input.teamBudgets.map((b) => ({
    teamId: b.teamId,
    teamName: teamName.get(b.teamId) ?? "—",
    budget: b.amount,
    seatDisplay: seatByTeam.get(b.teamId) ?? 0,
    apiUsd: input.apiUsdByTeam.get(b.teamId) ?? 0,
    fxRate: rate,
    thresholds: b.thresholds,
  }));

  // A verdict needs an honest TOTAL. With the seat half unknown (backfill) or
  // the FX rate missing, `combinedAmount` is null — the cockpit then goes
  // cold-start and the month is frozen with no verdict and no team statuses,
  // rather than a green judgement passed on half the money.
  const cockpit = buildCockpit({
    period,
    currency,
    periodEndLabel: `${period.daysInPeriod} de ${period.monthLabel}`,
    org:
      input.orgBudget !== null && seatsAmount !== null && rate !== null
        ? {
            budget: input.orgBudget.amount,
            seatDisplay: seatsAmount,
            apiUsd,
            fxRate: rate,
            thresholds: input.orgBudget.thresholds,
          }
        : null,
    teams: cockpitTeams,
    composition: input.reportedByProvider,
    closed,
  });

  const budgetedById = new Map(budgetedTeams(cockpit).map((t) => [t.teamId, t]));
  const budgetById = new Map(input.teamBudgets.map((b) => [b.teamId, b.amount]));

  // Per-team combined spend for EVERY team, budgeted or not — a report shows
  // the whole company, not only the governed slice.
  const mix = combineTeamSpend({
    teams,
    seatByTeam,
    apiUsdByTeam: input.apiUsdByTeam,
    seatUnattributed: seatAttribution?.unattributed ?? 0,
    apiUnattributedUsd: input.apiUnattributedUsd,
    fxRate: seatAttribution === null ? null : rate,
  });

  const snapshotTeams: SnapshotTeam[] = teams.map((t, i) => {
    const spend = mix === null ? null : mix.teamDrivers[i].value;
    const budget = budgetById.get(t.id) ?? null;
    const evaluated = budgetedById.get(t.id);
    return {
      teamId: t.id,
      teamName: t.name,
      spend,
      budget,
      pctSpent:
        evaluated !== undefined
          ? evaluated.evaluation.pctSpent
          : spend !== null && budget !== null && budget > 0
            ? spend / budget
            : null,
      status: evaluated?.status ?? null,
    };
  });

  const drivers =
    mix === null
      ? []
      : topDrivers([
          ...mix.teamDrivers,
          { label: UNATTRIBUTED_LABEL, value: mix.unattributed },
        ]);

  const reconciliation = reconcile(input.derivedUsd, apiUsd);
  const { nextStart } = monthRange(period.year, period.month);

  return {
    periodMonth: period.monthStart,
    monthLabel: period.monthLabel,
    closedAt: input.closedAt,
    source: input.source,
    dayOfPeriod: period.dayOfPeriod,
    daysInPeriod: period.daysInPeriod,
    currency,
    apiUsd,
    seatsAmount,
    combinedAmount,
    budgetAmount: input.orgBudget?.amount ?? null,
    // Only a month with both an org budget and a known seat half has a
    // percentage — the cockpit is "ready" in exactly that case.
    pctSpent: cockpit.state === "ready" ? cockpit.org.pctSpent : null,
    projection: cockpit.state === "ready" ? cockpit.org.projection : null,
    frozenFxRate: fx?.rate ?? null,
    fxRateSource: fx?.source ?? null,
    fxRateDate: fx?.date ?? null,
    verdictStatus: cockpit.state === "ready" ? cockpit.verdict.status : null,
    verdictSentence: cockpit.state === "ready" ? cockpit.verdict.sentence : null,
    breakdown: {
      teams: snapshotTeams,
      providers: input.reportedByProvider.map((p) => ({
        provider: p.provider,
        usd: p.usd,
        display: rate === null ? null : p.usd * rate,
      })),
      topDrivers: drivers,
      unattributed: {
        apiUsd: input.apiUnattributedUsd,
        seats: seatAttribution?.unattributed ?? null,
        display: mix === null ? null : mix.unattributed,
      },
      seats: {
        available: input.seats.available,
        total: seatsAmount,
        unattributed: seatAttribution?.unattributed ?? null,
        subscriptions: input.seats.available
          ? input.seats.subscriptions.map((s) => ({
              tool: s.tool,
              seatCount: s.seatCount,
              unitPrice: s.unitPrice,
              teamId: s.teamId,
              teamName: s.teamName,
              monthlyTotal: s.seatCount * s.unitPrice,
            }))
          : [],
      },
      reconciliation,
    },
    hasUncosted: input.hasUncosted,
    reconciliationOk: reconciliation.withinTolerance,
    fxMissing,
    // A month still running has no "end" to have synced past — every active
    // connector would trivially qualify. It gets the live rule the banners use
    // instead (>24h without a successful sync), so the report discloses exactly
    // what the screens disclose.
    staleSync: closed
      ? syncWasStale(input.connections, `${nextStart}T00:00:00.000Z`)
      : freshness(input.connections, new Date(input.closedAt)).showBanner,
  };
}
