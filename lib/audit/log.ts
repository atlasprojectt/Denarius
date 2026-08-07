import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { dbFailure, logFailure, logThrown } from "@/lib/logging/server-log";

import { redactDetail, redactTarget, type AuditDetail } from "./redact";

// Audit trail for administrative actions (issue #73). The entry is written next
// to the mutation, from the session requireAdmin() has already resolved — the
// guard is the natural seam, and there is no second place to keep in sync.

/**
 * Every action that leaves a trace. A typed union, not free text: the log stays
 * queryable and the pt-BR phrasing lives in the UI copy constants (F2) rather
 * than baked into rows nobody can re-word later.
 */
export type AuditAction =
  | "budget.created"
  | "budget.updated"
  | "budget.deleted"
  | "provider.key_saved"
  | "provider.key_rotated"
  | "provider.key_revoked"
  | "roster.imported"
  | "roster.employee_updated"
  | "roster.employee_removed"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.deleted"
  | "attribution.updated"
  | "invitation.created"
  | "invitation.revoked"
  | "invitation.accepted"
  | "user.removed"
  | "privacy.updated"
  | "tenant.exported"
  | "tenant.deleted"
  | "company.renamed"
  | "company.currency_changed";

/** Who acted. Shaped so `auth.session` from requireAdmin() passes straight in,
 *  and so acceptInvitation — which has no session by design — can name the
 *  invitee as the actor instead of being skipped. */
export type AuditActor = { userId: string; tenantId: string; email: string };

export type AuditContext = {
  /** What was acted on, as a label an Admin of this tenant can already see. */
  target?: string | null;
  /** The auditable substance: amounts before and after, counts, which switch
   *  moved. Never the value itself when the value is a secret. */
  detail?: AuditDetail;
};

type Row = {
  tenant_id: string;
  actor_id: string;
  actor_email: string;
  action: AuditAction;
  target: string | null;
  detail: AuditDetail;
};

function row(actor: AuditActor, action: AuditAction, context: AuditContext): Row {
  return {
    tenant_id: actor.tenantId,
    actor_id: actor.userId,
    actor_email: actor.email,
    action,
    target: redactTarget(context.target),
    detail: redactDetail(context.detail ?? {}),
  };
}

/**
 * Writes the rows and swallows every failure.
 *
 * Deliberate: an audit trail that can block a governance action will be removed
 * the first time it does. The budget still saves if the insert errors — the
 * failure is reported server-side and the mutation carries on.
 */
async function insert(rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  try {
    const { error } = await createAdminClient().from("audit_log").insert(rows);
    if (error) {
      logFailure("audit.insert", rows[0]?.tenant_id ?? null, {
        actions: rows.map((r) => r.action),
        ...dbFailure(error),
      });
    }
  } catch (cause) {
    logThrown("audit.insert", rows[0]?.tenant_id ?? null, cause);
  }
}

/** One entry, next to one mutation. Never throws. */
export async function recordAudit(
  actor: AuditActor,
  action: AuditAction,
  context: AuditContext = {},
): Promise<void> {
  await insert([row(actor, action, context)]);
}

/** Several entries from one submit (the budgets batch writes one per scope it
 *  actually changed), in a single round trip. Never throws. */
export async function recordAuditBatch(
  actor: AuditActor,
  entries: { action: AuditAction; context?: AuditContext }[],
): Promise<void> {
  await insert(entries.map((e) => row(actor, e.action, e.context ?? {})));
}
