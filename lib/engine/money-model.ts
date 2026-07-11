// Denarius engine — the monetary display contract (pure, no I/O). One place
// defines how every screen, e-mail and drawer turns stored money into shown
// money, so the same concept can never render as two different numbers
// (2026-07-11 audit, S1/QA-03/UX-01).
//
// Concepts (docs/backend.md §money):
// - Provider-reported API cost: cost_daily, USD — the headline truth.
// - Token-derived API cost: usage_daily.derived_cost, USD — the attribution
//   grain (per team / per person); drifts from reported are DISCLOSED via
//   reconcile(), never papered over.
// - Seat cost: manual subscriptions, entered and accrued in the tenant's
//   display currency directly (no conversion involved).
// - Governed spend: seats + API×fx in the display currency — what budgets
//   are measured against.
// - Frozen FX: ONE USD→display rate per tenant per period, resolved by
//   `periodFx` below. Budget rows keep their own captured triples as the
//   audit trail; display conversion always goes through the single resolved
//   rate so Home, Explore, team detail and e-mails can never disagree.
// - Missing FX: USD is shown as USD with an explicit disclosure — it is never
//   summed into a display-currency figure (invariant #3/#4).

/** The one USD→display conversion rate for the current period, disclosed. */
export type FrozenFx = {
  /** Multiply a USD amount by this to get the display currency. */
  rate: number;
  /** Where the rate came from (e.g. "open.er-api.com"), for the disclosure. */
  source: string | null;
  /** yyyy-mm-dd the rate was captured, for the disclosure. */
  date: string | null;
};

/** The FX triple as stored on a budget row (lib/budgets/queries.ts shape). */
export type FxCarrier = {
  frozenFxRate: number | null;
  fxRateSource: string | null;
  fxRateDate: string | null;
};

/**
 * Resolves THE period's frozen FX from the budgets governing it. Deterministic
 * preference: the org budget's captured rate wins; otherwise the team budget
 * with the earliest capture date (closest to period start), ties broken by
 * team id so re-renders can't flip the pick. Null when no budget carries a
 * rate — callers must then show USD with the missing-FX disclosure.
 */
export function periodFx(budgets: {
  org: FxCarrier | null;
  teams: (FxCarrier & { teamId: string | null })[];
}): FrozenFx | null {
  const carriers: (FxCarrier & { teamId: string | null })[] = [
    ...(budgets.org ? [{ ...budgets.org, teamId: null }] : []),
    ...[...budgets.teams].sort((a, b) => {
      const dateA = a.fxRateDate ?? "9999-12-31";
      const dateB = b.fxRateDate ?? "9999-12-31";
      if (dateA !== dateB) return dateA < dateB ? -1 : 1;
      return (a.teamId ?? "") < (b.teamId ?? "") ? -1 : 1;
    }),
  ];
  for (const c of carriers) {
    if (c.frozenFxRate !== null) {
      return { rate: c.frozenFxRate, source: c.fxRateSource, date: c.fxRateDate };
    }
  }
  return null;
}

/**
 * A USD-native amount prepared for display-currency-primary rendering: the
 * converted value leads, the original USD stays available as secondary detail.
 * `display` is null when the FX rate is missing — the UI then shows the USD
 * value with the disclosure instead of a guessed conversion.
 */
export type UsdDisplay = {
  usd: number;
  /** usd × fx.rate, or null when fx is null. */
  display: number | null;
  /** Display currency code (e.g. "BRL"). */
  currency: string;
  fx: FrozenFx | null;
};

/** Converts one USD amount under the resolved period FX. */
export function usdDisplay(
  usd: number,
  currency: string,
  fx: FrozenFx | null,
): UsdDisplay {
  return {
    usd,
    display: fx === null ? null : usd * fx.rate,
    currency,
    fx,
  };
}

/**
 * The explicit bridge between a scope's governed total and its parts —
 * the number the audit found missing between "Gasto R$ 1.477,75" and
 * "Custo por pessoa US$ 237,05": governed = seats (display) + API (USD × fx).
 * When FX is missing and there is API spend, the governed total is null
 * (undefined honestly) rather than a seats-only figure passed off as total.
 */
export type CostBridge = {
  currency: string;
  /** Seat accrual to date, display currency (native — never converted). */
  seatDisplay: number;
  /** Token-derived API cost to date, USD. */
  apiUsd: number;
  /** apiUsd × fx.rate, or null when fx is null. */
  apiDisplay: number | null;
  /** seatDisplay + apiDisplay; null when apiUsd > 0 but fx is missing. */
  governedDisplay: number | null;
  fx: FrozenFx | null;
};

export function costBridge(input: {
  currency: string;
  seatDisplay: number;
  apiUsd: number;
  fx: FrozenFx | null;
}): CostBridge {
  const { currency, seatDisplay, apiUsd, fx } = input;
  const apiDisplay = fx === null ? null : apiUsd * fx.rate;
  const governedDisplay =
    apiDisplay !== null ? seatDisplay + apiDisplay : apiUsd > 0 ? null : seatDisplay;
  return { currency, seatDisplay, apiUsd, apiDisplay, governedDisplay, fx };
}
