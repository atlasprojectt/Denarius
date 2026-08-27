"use server";

import { revalidatePath } from "next/cache";

import { recordAudit, recordAuditBatch } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/session";
import {
  deleteBudgetReturning,
  filterOwnedTeamIds,
  findBudgetForScope,
  findBudgetsForPeriod,
  findTenantDisplayCurrency,
  insertBudget,
  isOwnedTeam,
  updateBudgetById,
  type DeletedBudget,
} from "@/lib/db/admin";
import { monthStartUtc } from "@/lib/engine/period";
import { fetchUsdRate } from "@/lib/fx/rate";
import { dbFailure, logFailure } from "@/lib/logging/server-log";
import { budgetDeleteSchema, budgetSchema, fieldErrorsOf } from "@/lib/validation";

// Postgres errors arrive as throws with a `.code`; this keeps the dbFailure()
// log lines carrying the same `code` field the PostgREST path logged.
function errorCodeOf(cause: unknown): { code?: string | null } {
  return {
    code: ((cause as { code?: unknown } | null)?.code as string | undefined) ?? null,
  };
}

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
  const period = monthStartUtc();
  const thresholds = [warnPct / 100, 1.0];

  // Resolve the tenant currency (budget amount is in the display currency) and,
  // for team scope, verify the team belongs to this tenant.
  const [currencyResult, ownedTeam] = await Promise.all([
    findTenantDisplayCurrency(tenantId).then(
      (currency) => ({ ok: true as const, currency }),
      (cause: unknown) => ({ ok: false as const, cause }),
    ),
    scope === "team"
      ? isOwnedTeam(tenantId, teamId)
      : Promise.resolve(true),
  ]);
  if (!currencyResult.ok) {
    logFailure("budget.save", tenantId, {
      step: "currency",
      ...dbFailure(errorCodeOf(currencyResult.cause)),
    });
    return { error: "Não foi possível salvar. Tente novamente." };
  }
  if (scope === "team" && !ownedTeam) return { error: "Escolha um time válido." };
  // Data default: a missing tenant row reads as the day-zero BRL (#23 posture).
  const currency = currencyResult.currency ?? "BRL";

  // Existing budget for this scope + period? Edit it (keeping the frozen rate);
  // otherwise create it and freeze the rate now.
  let existing: { id: string; amount: number } | null;
  try {
    existing = await findBudgetForScope(tenantId, scope, teamId, period);
  } catch (cause) {
    logFailure("budget.save", tenantId, {
      step: "existing_budget",
      ...dbFailure(errorCodeOf(cause)),
    });
    return { error: "Não foi possível salvar. Tente novamente." };
  }
  const auditTarget = scope === "org" ? "Empresa" : teamId;

  if (existing) {
    let matched: number;
    try {
      matched = await updateBudgetById(existing.id, tenantId, {
        amount,
        thresholds,
        updated_at: new Date().toISOString(),
      });
    } catch (cause) {
      logFailure("budget.update", tenantId, { scope, matched: 0, ...dbFailure(errorCodeOf(cause)) });
      return { error: "Não foi possível salvar. Tente novamente." };
    }
    if (matched === 0) {
      logFailure("budget.update", tenantId, { scope, matched: 0, ...dbFailure(null) });
      return { error: "Não foi possível salvar. Tente novamente." };
    }
    await recordAudit(auth.session, "budget.updated", {
      target: auditTarget,
      detail: { scope, from: existing.amount, to: amount, warnPct },
    });
  } else {
    const frozen = await fetchUsdRate(currency);
    try {
      await insertBudget({
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
    } catch (cause) {
      logFailure("budget.create", tenantId, { scope, ...dbFailure(errorCodeOf(cause)) });
      return { error: "Não foi possível salvar. Tente novamente." };
    }
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
    let ownedIds: string[];
    try {
      ownedIds = await filterOwnedTeamIds(tenantId, teamIds);
    } catch (cause) {
      logFailure("budget.batch", tenantId, {
        step: "team_ownership",
        ...dbFailure(errorCodeOf(cause)),
      });
      return { error: "Não foi possível salvar os orçamentos. Tente novamente." };
    }
    const owned = new Set(ownedIds);
    for (const row of rows) {
      if (row.teamId !== null && !owned.has(row.teamId)) {
        return { error: "Escolha um time válido." };
      }
    }
  }

  // 3. Split update vs insert against the budgets governing this period.
  const [currencyResult, existingResult] = await Promise.allSettled([
    findTenantDisplayCurrency(tenantId),
    findBudgetsForPeriod(tenantId, period),
  ]);
  if (
    currencyResult.status === "rejected" ||
    existingResult.status === "rejected"
  ) {
    logFailure("budget.batch", tenantId, {
      step: "load_context",
      tenantCode:
        currencyResult.status === "rejected"
          ? (errorCodeOf(currencyResult.reason).code ?? null)
          : null,
      budgetCode:
        existingResult.status === "rejected"
          ? (errorCodeOf(existingResult.reason).code ?? null)
          : null,
    });
    return { error: "Não foi possível salvar os orçamentos. Tente novamente." };
  }
  // Data default: a missing tenant row reads as the day-zero BRL (#23 posture).
  const currency = currencyResult.value ?? "BRL";
  const existing = existingResult.value;
  const existingRow = (scope: string, teamId: string | null) =>
    existing.find((b) => b.scope === scope && b.team_id === teamId) ?? null;

  // The warn threshold as the whole percent the form edits. Compared in that
  // unit rather than as a fraction: `numeric(4,3)[]` can come back as strings,
  // and float equality on 0.8 is not a comparison worth trusting.
  // A row whose thresholds cannot be read yields NaN, which compares unequal
  // to everything — an unknown previous state records the entry rather than
  // swallowing it. That is the right direction to fail for a trail.
  const warnPctOf = (thresholds: (number | string)[] | null | undefined) =>
    Math.round(Number(thresholds?.[0]) * 100);

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
      let matched: number;
      try {
        matched = await updateBudgetById(previous.id, tenantId, {
          amount: row.amount,
          thresholds: row.thresholds,
          updated_at: now,
        });
      } catch (cause) {
        logFailure("budget.batch_update", tenantId, {
          scope: row.scope,
          matched: 0,
          ...dbFailure(errorCodeOf(cause)),
        });
        failed.push(label);
        continue;
      }
      const warnPct = warnPctOf(row.thresholds);
      const previousWarnPct = warnPctOf(previous.thresholds);
      if (matched === 0) {
        logFailure("budget.batch_update", tenantId, {
          scope: row.scope,
          matched: 0,
          ...dbFailure(null),
        });
        failed.push(label);
      } else if (previous.amount !== row.amount || previousWarnPct !== warnPct) {
        // An untouched row is re-submitted by the batch form on every save;
        // recording it would bury the real changes in noise. But the UPDATE
        // above writes the thresholds too, and moving the warn threshold
        // changes when this tenant gets alerted — a governance edit with no
        // trail is the thing #73 exists to prevent.
        audited.push({
          action: "budget.updated",
          context: {
            target,
            detail: {
              scope: row.scope,
              from: previous.amount,
              to: row.amount,
              warnPct,
              fromWarnPct: previousWarnPct,
            },
          },
        });
      }
    } else {
      try {
        await insertBudget({
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
      } catch (cause) {
        logFailure("budget.batch_create", tenantId, { scope: row.scope, ...dbFailure(errorCodeOf(cause)) });
        failed.push(label);
        continue;
      }
      audited.push({
        action: "budget.created",
        context: { target, detail: { scope: row.scope, amount: row.amount, currency } },
      });
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

  // Returning the deleted row costs nothing extra and is what the audit entry
  // needs: which budget was removed, and for how much (#73).
  let outcome: { count: number; row: DeletedBudget | null };
  try {
    outcome = await deleteBudgetReturning(parsed.data.budgetId, tenantId);
  } catch (cause) {
    logFailure("budget.delete", tenantId, dbFailure(errorCodeOf(cause)));
    return { error: "Não foi possível remover. Tente novamente." };
  }
  // Idempotent: repeated submit / cross-tenant id match nothing — the desired
  // end state already holds (QA-05 destructive-action contract).
  if (outcome.count === 0) return { success: "Orçamento já havia sido removido." };

  const deleted = outcome.row;
  if (deleted) {
    await recordAudit(auth.session, "budget.deleted", {
      target: deleted.scope === "org" ? "Empresa" : deleted.team_id,
      detail: { scope: deleted.scope, amount: deleted.amount },
    });
  }

  revalidatePath("/", "layout");
  return { success: "Orçamento removido." };
}
