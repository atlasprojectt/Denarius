import "server-only";

import { dbFailure, logFailure } from "@/lib/logging/server-log";
import { createAdminClient } from "@/lib/supabase/admin";

type BudgetScope = "org" | "team";

function throwIfError(error: { code?: string; message?: string } | null): void {
  if (error) throw error;
}

/**
 * Privileged budget adapter. Authenticated screens read `budget` through the
 * Supabase project, so admin mutations must use that same project too. The
 * tenant predicate stays explicit because this client bypasses RLS.
 */

export async function isOwnedTeam(
  tenantId: string,
  teamId: string | null,
): Promise<boolean> {
  if (teamId === null) return true;

  const { data, error } = await createAdminClient()
    .from("team")
    .select("is_unattributed")
    .eq("id", teamId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) {
    logFailure("team.ownership", tenantId, dbFailure(error));
    return false;
  }
  return data !== null && data.is_unattributed === false;
}

export async function findTenantDisplayCurrency(
  tenantId: string,
): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("tenant")
    .select("display_currency")
    .eq("id", tenantId)
    .maybeSingle();
  throwIfError(error);
  return data?.display_currency ?? null;
}

export async function findBudgetForScope(
  tenantId: string,
  scope: BudgetScope,
  teamId: string | null,
  periodMonth: string,
): Promise<{ id: string; amount: number } | null> {
  let query = createAdminClient()
    .from("budget")
    .select("id, amount")
    .eq("tenant_id", tenantId)
    .eq("scope", scope)
    .eq("period_month", periodMonth);
  query = teamId === null ? query.is("team_id", null) : query.eq("team_id", teamId);

  const { data, error } = await query.maybeSingle();
  throwIfError(error);
  return data === null ? null : { id: data.id, amount: Number(data.amount) };
}

export async function updateBudgetById(
  id: string,
  tenantId: string,
  patch: { amount: number; thresholds: number[]; updated_at: string },
): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("budget")
    .update(patch, { count: "exact" })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  throwIfError(error);
  return count ?? 0;
}

export type BudgetInsert = {
  tenant_id: string;
  scope: BudgetScope;
  team_id: string | null;
  period_month: string;
  amount: number;
  currency: string;
  thresholds: number[];
  frozen_fx_rate: number | null;
  fx_rate_source: string | null;
  fx_rate_date: string | null;
};

export async function insertBudget(row: BudgetInsert): Promise<void> {
  const { error } = await createAdminClient().from("budget").insert(row);
  throwIfError(error);
}

export async function filterOwnedTeamIds(
  tenantId: string,
  teamIds: string[],
): Promise<string[]> {
  if (teamIds.length === 0) return [];
  const { data, error } = await createAdminClient()
    .from("team")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_unattributed", false)
    .in("id", teamIds);
  throwIfError(error);
  return (data ?? []).map((row) => row.id);
}

export type BudgetForPeriod = {
  id: string;
  scope: BudgetScope;
  team_id: string | null;
  amount: number;
  thresholds: (number | string)[];
};

export async function findBudgetsForPeriod(
  tenantId: string,
  periodMonth: string,
): Promise<BudgetForPeriod[]> {
  const { data, error } = await createAdminClient()
    .from("budget")
    .select("id, scope, team_id, amount, thresholds")
    .eq("tenant_id", tenantId)
    .eq("period_month", periodMonth);
  throwIfError(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    scope: row.scope as BudgetScope,
    team_id: row.team_id,
    amount: Number(row.amount),
    thresholds: (row.thresholds ?? []).map((value: number | string) => Number(value)),
  }));
}

export type DeletedBudget = {
  scope: BudgetScope;
  team_id: string | null;
  amount: number;
};

export async function deleteBudgetReturning(
  id: string,
  tenantId: string,
): Promise<{ count: number; row: DeletedBudget | null }> {
  const { data, error, count } = await createAdminClient()
    .from("budget")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("scope, team_id, amount");
  throwIfError(error);
  const row = data?.[0];
  return {
    count: count ?? data?.length ?? 0,
    row: row
      ? {
          scope: row.scope as BudgetScope,
          team_id: row.team_id,
          amount: Number(row.amount),
        }
      : null,
  };
}
