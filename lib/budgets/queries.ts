import "server-only";

import { monthStartUtc } from "@/lib/engine/period";
import { createClient } from "@/lib/supabase/server";

// Read path for budgets, shared by the settings CRUD screen and (later, #19)
// the home cockpit. Scoped to the CURRENT period so the engine always compares
// spend against the budget that governs this month.

export type Budget = {
  id: string;
  scope: "org" | "team";
  teamId: string | null;
  amount: number;
  currency: string;
  /** fractions of the budget, e.g. [0.8, 1.0]. */
  thresholds: number[];
  /** USD → display, frozen at period start; null when capture wasn't possible. */
  frozenFxRate: number | null;
  fxRateSource: string | null;
  fxRateDate: string | null;
};

export type BudgetList = {
  org: Budget | null;
  teams: Budget[];
  currency: string;
};

type BudgetRow = {
  id: string;
  scope: "org" | "team";
  team_id: string | null;
  amount: number;
  currency: string;
  thresholds: number[] | null;
  frozen_fx_rate: number | null;
  fx_rate_source: string | null;
  fx_rate_date: string | null;
};

function mapRow(row: BudgetRow): Budget {
  return {
    id: row.id,
    scope: row.scope,
    teamId: row.team_id,
    amount: row.amount,
    currency: row.currency,
    thresholds: row.thresholds ?? [0.8, 1.0],
    frozenFxRate: row.frozen_fx_rate,
    fxRateSource: row.fx_rate_source,
    fxRateDate: row.fx_rate_date,
  };
}

/** Budgets governing the current period, split into the org budget and team budgets. */
export async function listBudgets(): Promise<BudgetList> {
  const supabase = await createClient();
  const period = monthStartUtc();

  const [{ data: budgetData }, { data: tenantData }] = await Promise.all([
    supabase
      .from("budget")
      .select(
        "id, scope, team_id, amount, currency, thresholds, frozen_fx_rate, fx_rate_source, fx_rate_date",
      )
      .eq("period_month", period),
    supabase.from("tenant").select("display_currency").maybeSingle(),
  ]);

  const rows = (budgetData ?? []) as BudgetRow[];
  const org = rows.find((r) => r.scope === "org");
  const teams = rows.filter((r) => r.scope === "team").map(mapRow);
  const currency =
    (tenantData as { display_currency: string } | null)?.display_currency ??
    "BRL";

  return {
    org: org ? mapRow(org) : null,
    teams,
    currency,
  };
}
