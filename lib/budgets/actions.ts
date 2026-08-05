"use server";

import { revalidatePath } from "next/cache";

import { recordAudit, recordAuditBatch } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/session";
import { monthStartUtc } from "@/lib/engine/period";
import { fetchUsdRate } from "@/lib/fx/rate";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnedTeam } from "@/lib/teams/queries";
import { budgetDeleteSchema, budgetSchema, fieldErrorsOf } from "@/lib/validation";

export type BudgetFormState = {
  error?: string;
  success?: string;
  /** Field-name → message, for the unified inline validation (S2/QA-06). */
  fieldErrors?: Record<string, string>;
};

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
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

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
    // The previous amount is what makes the audit entry evidence rather than a
    // notification: "changed from X to Y" is the auditable substance (#73).
    .select("id, amount")
    .eq("tenant_id", tenantId)
    .eq("scope", scope)
    .eq("period_month", period);
  const { data: existingData } = await (teamId === null
    ? existingQuery.is("team_id", null)
    : existingQuery.eq("team_id", teamId)
  ).maybeSingle();
  const existing = existingData as { id: string; amount: number } | null;
  const auditTarget = scope === "org" ? "Empresa" : teamId;

  if (existing) {
    const { error, count } = await admin
      .from("budget")
      .update(
        { amount, thresholds, updated_at: new Date().toISOString() },
        { count: "exact" },
      )
      .eq("id", existing.id)
      .eq("tenant_id", tenantId);
    if (error || count === 0) {
      return { error: "Não foi possível salvar. Tente novamente." };
    }
    await recordAudit(auth.session, "budget.updated", {
      target: auditTarget,
      detail: { scope, from: existing.amount, to: amount, warnPct },
    });
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
    await recordAudit(auth.session, "budget.created", {
      target: auditTarget,
      detail: { scope, amount, currency, warnPct },
    });
  }

  // Budgets drive the verdict on Home, Explore and every team detail page —
  // whole-tree invalidation (QA-02 rule, see lib/providers/actions.ts).
  revalidatePath("/", "layout");
  return { success: "Orçamento salvo." };
}

export type BudgetBatchState = {
  error?: string;
  success?: string;
  /** Keyed by the row field name (e.g. "amount|team:<id>") — inline errors. */
  fieldErrors?: Record<string, string>;
};

/** Batch row key: "org" or "team:<uuid>" — mirrors the form field names. */
function parseRowKey(key: string): { scope: "org" | "team"; teamId: string | null } | null {
  if (key === "org") return { scope: "org", teamId: null };
  if (key.startsWith("team:") && key.length > 5) {
    return { scope: "team", teamId: key.slice(5) };
  }
  return null;
}

/**
 * Batch-edit contract for the single budgets table (2026-07-11 audit, UX-09):
 * one Save writes every filled row. Validation is all-or-nothing — any invalid
 * row blocks the whole batch with per-field errors and NOTHING is written.
 * Writes are then applied per row; a mid-batch database failure (same table,
 * same transaction budget — rare) is reported unambiguously: which scopes
 * saved, which failed (documented strategy, docs/backend.md). Frozen FX is
 * preserved: existing rows keep their captured triple; new rows share ONE
 * fresh capture, consistent with the period-FX resolution. Rows with an empty
 * amount are untouched — removal is a separate confirmed destructive action.
 */
export async function saveBudgetsBatch(
  _prev: BudgetBatchState,
  formData: FormData,
): Promise<BudgetBatchState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };
  const { tenantId } = auth.session;
  const admin = createAdminClient();
  const period = monthStartUtc();

  // 1. Parse + validate EVERY submitted row before touching the database.
  const rowKeys = formData.getAll("row").map((v) => String(v));
  const fieldErrors: Record<string, string> = {};
  const rows: {
    key: string;
    scope: "org" | "team";
    teamId: string | null;
    amount: number;
    thresholds: number[];
  }[] = [];

  for (const key of rowKeys) {
    const parsedKey = parseRowKey(key);
    if (!parsedKey) return { error: "Linha de orçamento inválida." };

    const rawAmount = formData.get(`amount|${key}`);
    const amountText = typeof rawAmount === "string" ? rawAmount.trim() : "";
    if (amountText === "") continue; // untouched row — no budget for this scope

    const parsed = budgetSchema.safeParse({
      scope: parsedKey.scope,
      teamId: parsedKey.teamId,
      amount: amountText,
      warnPct: formData.get(`warnPct|${key}`) ?? undefined,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] === "warnPct" ? "warnPct" : "amount";
        const name = `${field}|${key}`;
        if (!(name in fieldErrors)) fieldErrors[name] = issue.message;
      }
      continue;
    }
    rows.push({
      key,
      scope: parsed.data.scope,
      teamId: parsed.data.teamId,
      amount: parsed.data.amount,
      thresholds: [parsed.data.warnPct / 100, 1.0],
    });
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Corrija os campos destacados.", fieldErrors };
  }
  if (rows.length === 0) return { error: "Nenhum orçamento para salvar." };

  // 2. Tenant ownership for every team row (one query, not N).
  const teamIds = rows.filter((r) => r.teamId !== null).map((r) => r.teamId as string);
  if (teamIds.length > 0) {
    const { data: ownedData } = await admin
      .from("team")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("is_unattributed", false)
      .in("id", teamIds);
    const owned = new Set(((ownedData ?? []) as { id: string }[]).map((t) => t.id));
    for (const row of rows) {
      if (row.teamId !== null && !owned.has(row.teamId)) {
        return { error: "Escolha um time válido." };
      }
    }
  }

  // 3. Split update vs insert against the budgets governing this period.
  const [{ data: tenant }, { data: existingData }] = await Promise.all([
    admin.from("tenant").select("display_currency").eq("id", tenantId).maybeSingle(),
    admin
      .from("budget")
      .select("id, scope, team_id, amount")
      .eq("tenant_id", tenantId)
      .eq("period_month", period),
  ]);
  const currency =
    (tenant as { display_currency: string } | null)?.display_currency ?? "BRL";
  const existing = (existingData ?? []) as {
    id: string;
    scope: string;
    team_id: string | null;
    amount: number;
  }[];
  const existingRow = (scope: string, teamId: string | null) =>
    existing.find((b) => b.scope === scope && b.team_id === teamId) ?? null;

  // One FX capture shared by every NEW row — the same single-rate-per-period
  // contract the screens resolve with (lib/engine/money-model.ts).
  const hasNewRow = rows.some((r) => existingRow(r.scope, r.teamId) === null);
  const frozen = hasNewRow ? await fetchUsdRate(currency) : null;

  // 4. Apply row by row, collecting failures for the unambiguous report.
  const failed: string[] = [];
  // One audit entry per scope that actually changed — the enum's unit is a
  // budget, not a submit — written in a single round trip at the end (#73).
  const audited: {
    action: "budget.created" | "budget.updated";
    context: { target: string | null; detail: Record<string, string | number> };
  }[] = [];
  const now = new Date().toISOString();
  for (const row of rows) {
    const previous = existingRow(row.scope, row.teamId);
    const label = row.scope === "org" ? "Empresa" : row.key;
    const target = row.scope === "org" ? "Empresa" : row.teamId;
    if (previous !== null) {
      const { error, count } = await admin
        .from("budget")
        .update(
          { amount: row.amount, thresholds: row.thresholds, updated_at: now },
          { count: "exact" },
        )
        .eq("id", previous.id)
        .eq("tenant_id", tenantId);
      if (error || count === 0) {
        failed.push(label);
      } else if (previous.amount !== row.amount) {
        // An untouched row is re-submitted by the batch form on every save;
        // recording it would bury the real changes in noise.
        audited.push({
          action: "budget.updated",
          context: {
            target,
            detail: { scope: row.scope, from: previous.amount, to: row.amount },
          },
        });
      }
    } else {
      const { error } = await admin.from("budget").insert({
        tenant_id: tenantId,
        scope: row.scope,
        team_id: row.teamId,
        period_month: period,
        amount: row.amount,
        currency,
        thresholds: row.thresholds,
        frozen_fx_rate: frozen?.rate ?? null,
        fx_rate_source: frozen?.source ?? null,
        fx_rate_date: frozen?.date ?? null,
      });
      if (error) {
        failed.push(label);
      } else {
        audited.push({
          action: "budget.created",
          context: { target, detail: { scope: row.scope, amount: row.amount, currency } },
        });
      }
    }
  }

  await recordAuditBatch(auth.session, audited);

  revalidatePath("/", "layout");
  if (failed.length > 0) {
    return {
      error: `Parte do lote não foi salva (${failed.length} de ${rows.length}). Os demais orçamentos foram gravados — tente salvar novamente.`,
    };
  }
  return { success: "Orçamentos salvos." };
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

  // Returning the deleted row costs nothing extra and is what the audit entry
  // needs: which budget was removed, and for how much (#73).
  const { data: removed, error, count } = await admin
    .from("budget")
    .delete({ count: "exact" })
    .eq("id", parsed.data.budgetId)
    .eq("tenant_id", tenantId)
    .select("scope, team_id, amount");
  if (error) return { error: "Não foi possível remover. Tente novamente." };
  // Idempotent: repeated submit / cross-tenant id match nothing — the desired
  // end state already holds (QA-05 destructive-action contract).
  if (count === 0) return { success: "Orçamento já havia sido removido." };

  const deleted = ((removed ?? []) as {
    scope: string;
    team_id: string | null;
    amount: number;
  }[])[0];
  if (deleted) {
    await recordAudit(auth.session, "budget.deleted", {
      target: deleted.scope === "org" ? "Empresa" : deleted.team_id,
      detail: { scope: deleted.scope, amount: deleted.amount },
    });
  }

  revalidatePath("/", "layout");
  return { success: "Orçamento removido." };
}
