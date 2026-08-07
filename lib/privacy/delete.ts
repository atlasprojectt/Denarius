import "server-only";

import { recordAudit, type AuditActor } from "@/lib/audit/log";
import { createAdminClient } from "@/lib/supabase/admin";

export type TenantDeletionFailure =
  | "tenant_not_found"
  | "name_mismatch"
  | "credential_revoke_failed"
  | "membership_read_failed"
  | "auth_delete_failed"
  | "tenant_delete_failed";

export type TenantDeletionResult =
  | { ok: true }
  | { ok: false; reason: TenantDeletionFailure };

type TenantRow = { name: string };
type MembershipRow = { id: string };

/**
 * Irreversible tenant teardown, ordered around the failure modes:
 *
 * 1. discard provider ciphertext before anything can strand it;
 * 2. delete every other Auth user, then the acting Admin;
 * 3. delete the tenant row and let the declared cascades remove all data.
 *
 * The actor goes last so a failure deleting another member still leaves one
 * Admin able to retry. Auth users go before the tenant: the opposite order can
 * leave an orphan Auth account that reaches onboarding and creates a new space.
 */
export async function deleteTenantPermanently(input: {
  actor: AuditActor;
  companyName: string;
}): Promise<TenantDeletionResult> {
  const admin = createAdminClient();
  const { data: tenantData, error: tenantError } = await admin
    .from("tenant")
    .select("name")
    .eq("id", input.actor.tenantId)
    .maybeSingle();
  if (tenantError || !tenantData) {
    return { ok: false, reason: "tenant_not_found" };
  }

  const tenant = tenantData as TenantRow;
  if (input.companyName !== tenant.name) {
    return { ok: false, reason: "name_mismatch" };
  }

  const { error: revokeError } = await admin
    .from("provider_connection")
    .update({
      status: "revoked",
      encrypted_credential: null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", input.actor.tenantId);
  if (revokeError) {
    return { ok: false, reason: "credential_revoke_failed" };
  }

  const { data: membershipData, error: membershipError } = await admin
    .from("app_user")
    .select("id")
    .eq("tenant_id", input.actor.tenantId);
  if (membershipError) {
    return { ok: false, reason: "membership_read_failed" };
  }

  const memberIds = ((membershipData ?? []) as MembershipRow[]).map(
    (membership) => membership.id,
  );
  if (!memberIds.includes(input.actor.userId)) {
    return { ok: false, reason: "membership_read_failed" };
  }
  const orderedUserIds = [
    ...memberIds.filter((id) => id !== input.actor.userId),
    ...memberIds.filter((id) => id === input.actor.userId),
  ];

  // This entry is intentionally removed by the tenant cascade. Keeping a
  // customer-identifying tombstone after erasure would contradict the erasure;
  // the call still proves the administrative path was audited before teardown.
  await recordAudit(input.actor, "tenant.deleted", {
    target: "Empresa",
    detail: { userCount: orderedUserIds.length },
  });

  for (const userId of orderedUserIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      return { ok: false, reason: "auth_delete_failed" };
    }
  }

  const { error: deleteError, count } = await admin
    .from("tenant")
    .delete({ count: "exact" })
    .eq("id", input.actor.tenantId);
  if (deleteError || count !== 1) {
    console.error("[tenant-deletion] tenant cascade failed after auth cleanup");
    return { ok: false, reason: "tenant_delete_failed" };
  }

  return { ok: true };
}
