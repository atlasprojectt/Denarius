"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import { monthStartUtc } from "@/lib/engine/period";
import { fetchUsdRate } from "@/lib/fx/rate";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnedTeam } from "@/lib/teams/queries";
import { budgetDeleteSchema, budgetSchema } from "@/lib/validation";

export type BudgetFormState = { error?: string; success?: string };

/** An empty team select ("") means the org scope → stored as null. */
function readTeamId(formData: FormData): string | null {
  const raw = formData.get("teamId");
  const value = typeof raw === "string" ? raw.trim() : "";
  return value === "" ? null : value;
}

/**
 * Creates or edits the budget for the CURRENT period (org or one team). The FX
 * rate is FROZEN at period start: captured on the first save for the period and
 * kept untouched on later edits, so mid-period edits change the amount, never
 * the conversion (PRD P8). Mid-period edits recompute findings on the next sync;
 * notification_log is not touched here (invariant #6 — that's #20's concern).
 */
export async function upsertBudget(
  _prev: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = budgetSchema.safeParse({
    scope: formData.get("scope"),
    teamId: readTeamId(formData),
    amount: formData.get("amount"),
    warnPct: formData.get("warnPct"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { scope, teamId, amount, warnPct } = parsed.data;
  const { tenantId } = auth.session;
  const admin = createAdminClient();
  const period = monthStartUtc();
  const thresholds = [warnPct / 100, 1.0];

  // Resolve the tenant currency (budget amount is in the display currency) and,
  // for team scope, verify the team belongs to this tenant.
  const [{ data: tenant }, ownedTeam] = await Promise.all([
    admin.from("tenant").select("display_currency").eq("id", tenantId).maybeSingle(),
    scope === "team"
      ? isOwnedTeam(admin, tenantId, teamId)
      : Promise.resolve(true),
  ]);
  if (scope === "team" && !ownedTeam) return { error: "Escolha um time válido." };
  const currency =
    (tenant as { display_currency: string } | null)?.display_currency ?? "BRL";

  // Existing budget for this scope + period? Edit it (keeping the frozen rate);
  // otherwise create it and freeze the rate now.
  const existingQuery = admin
    .from("budget")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("scope", scope)
    .eq("period_month", period);
  const { data: existing } = await (teamId === null
    ? existingQuery.is("team_id", null)
    : existingQuery.eq("team_id", teamId)
  ).maybeSingle();

  if (existing) {
    const { error, count } = await admin
      .from("budget")
      .update(
        { amount, thresholds, updated_at: new Date().toISOString() },
        { count: "exact" },
      )
      .eq("id", (existing as { id: string }).id)
      .eq("tenant_id", tenantId);
    if (error || count === 0) {
      return { error: "Não foi possível salvar. Tente novamente." };
    }
  } else {
    const frozen = await fetchUsdRate(currency);
    const { error } = await admin.from("budget").insert({
      tenant_id: tenantId,
      scope,
      team_id: teamId,
      period_month: period,
      amount,
      currency,
      thresholds,
      frozen_fx_rate: frozen?.rate ?? null,
      fx_rate_source: frozen?.source ?? null,
      fx_rate_date: frozen?.date ?? null,
    });
    if (error) return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/ajustes/orcamentos");
  revalidatePath("/ajustes");
  revalidatePath("/");
  return { success: "Orçamento salvo." };
}

export async function deleteBudget(
  _prev: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = budgetDeleteSchema.safeParse({
    budgetId: formData.get("budgetId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { tenantId } = auth.session;
  const admin = createAdminClient();

  const { error, count } = await admin
    .from("budget")
    .delete({ count: "exact" })
    .eq("id", parsed.data.budgetId)
    .eq("tenant_id", tenantId);
  if (error || count === 0) {
    return { error: "Não foi possível remover. Tente novamente." };
  }

  revalidatePath("/ajustes/orcamentos");
  revalidatePath("/ajustes");
  revalidatePath("/");
  return { success: "Orçamento removido." };
}
