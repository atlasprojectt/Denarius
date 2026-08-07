"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/session";
import { canRemoveUser } from "@/lib/privacy/policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  companySettingsSchema,
  digestPreferenceSchema,
  displayCurrencySchema,
  privacySettingsSchema,
  profileNameSchema,
  removeUserSchema,
} from "@/lib/validation";

export type SettingsFormState = { error?: string; success?: string };

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

function revalidateAccountSurfaces() {
  revalidatePath("/configuracoes");
  revalidatePath("/ajustes");
  revalidatePath("/", "layout");
}

/** Privacy toggles (#23): names visibility + person-grain storage. Admin-only;
 *  both gate behavior server-side (display and ingestion), not just the UI. */
export async function updatePrivacySettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = privacySettingsSchema.safeParse({
    showNames: formData.get("showNames") === "on",
    storePerPerson: formData.get("storePerPerson") === "on",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const admin = createAdminClient();
  const { error, count } = await admin
    .from("tenant")
    .update(
      {
        show_names: parsed.data.showNames,
        store_per_person: parsed.data.storePerPerson,
      },
      { count: "exact" },
    )
    .eq("id", auth.session.tenantId);

  if (error || count !== 1) {
    return { error: "Não foi possível salvar as preferências de privacidade." };
  }

  await recordAudit(auth.session, "privacy.updated", {
    detail: {
      showNames: parsed.data.showNames,
      storePerPerson: parsed.data.storePerPerson,
    },
  });

  revalidateAccountSurfaces();
  return { success: "Privacidade salva." };
}

/** Remove a user from the tenant (#23). Admin-only; can't remove yourself
 *  (would strand the tenant's last admin). Deleting the auth user cascades the
 *  app_user row, so RLS denies them every table immediately. */
export async function removeUser(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = removeUserSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { userId } = parsed.data;
  if (
    !canRemoveUser({
      actorRole: auth.session.role,
      actorId: auth.session.userId,
      targetId: userId,
    })
  ) {
    return { error: "Você não pode remover a si mesmo." };
  }

  const admin = createAdminClient();
  // Scope to this tenant BEFORE touching auth — never delete across tenants.
  const { data: target } = await admin
    .from("app_user")
    // The email comes along for the audit entry: the row is about to be
    // cascaded away, and "removed a uuid" is not a trail (#73).
    .select("id, email")
    .eq("id", userId)
    .eq("tenant_id", auth.session.tenantId)
    .maybeSingle();
  // Idempotent: a repeated submit (or an id outside this tenant) matches
  // nothing — the desired end state already holds and nothing is mutated
  // (QA-05 destructive-action contract; same response either way, no leak).
  if (!target) return { success: "Usuário já não faz parte deste espaço." };

  // Deleting the auth user cascades app_user (id → auth.users on delete cascade).
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: "Não foi possível remover o usuário. Tente novamente." };

  await recordAudit(auth.session, "user.removed", {
    target: (target as { id: string; email: string }).email,
  });

  revalidateAccountSurfaces();
  return { success: "Usuário removido." };
}

/** Change the display currency (#23) — allowed ONLY at day zero (no budgets,
 *  no subscriptions), so a frozen-FX budget or seat cost can never be silently
 *  re-denominated (invariant #4). */
export async function updateDisplayCurrency(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = displayCurrencySchema.safeParse({
    currency: formData.get("currency"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const admin = createAdminClient();
  const [{ count: budgetCount }, { count: subscriptionCount }] = await Promise.all([
    admin
      .from("budget")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", auth.session.tenantId),
    admin
      .from("subscription")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", auth.session.tenantId),
  ]);
  if ((budgetCount ?? 0) > 0 || (subscriptionCount ?? 0) > 0) {
    return {
      error:
        "A moeda só pode mudar antes de haver orçamentos ou assinaturas — eles já estão denominados nela.",
    };
  }

  const { error, count } = await admin
    .from("tenant")
    .update({ display_currency: parsed.data.currency }, { count: "exact" })
    .eq("id", auth.session.tenantId);

  if (error || count !== 1) {
    return { error: "Não foi possível salvar a moeda. Tente novamente." };
  }

  await recordAudit(auth.session, "company.currency_changed", {
    target: parsed.data.currency,
  });

  revalidateAccountSurfaces();
  return { success: "Moeda salva." };
}

export async function updateProfileName(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const parsed = profileNameSchema.safeParse({
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const admin = createAdminClient();
  const { error, count } = await admin
    .from("app_user")
    .update({ display_name: parsed.data.displayName }, { count: "exact" })
    .eq("id", user.id);

  if (error || count !== 1) {
    return { error: "Não foi possível salvar seu perfil. Tente novamente." };
  }

  revalidateAccountSurfaces();
  return { success: "Perfil salvo." };
}

/** Weekly-digest opt-out (issue #20) — each user controls their own row. */
export async function updateDigestPreference(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const parsed = digestPreferenceSchema.safeParse({
    receiveDigest: formData.get("receiveDigest") === "on",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const admin = createAdminClient();
  const { error, count } = await admin
    .from("app_user")
    .update({ digest_opt_out: !parsed.data.receiveDigest }, { count: "exact" })
    .eq("id", user.id);

  if (error || count !== 1) {
    return { error: "Não foi possível salvar a preferência. Tente novamente." };
  }

  revalidateAccountSurfaces();
  return { success: "Preferência salva." };
}

export async function updateCompanyName(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = companySettingsSchema.safeParse({
    companyName: formData.get("companyName"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const admin = createAdminClient();
  const { error, count } = await admin
    .from("tenant")
    .update({ name: parsed.data.companyName }, { count: "exact" })
    .eq("id", auth.session.tenantId);

  if (error || count !== 1) {
    return { error: "Não foi possível salvar a empresa. Tente novamente." };
  }

  await recordAudit(auth.session, "company.renamed", {
    target: parsed.data.companyName,
  });

  revalidateAccountSurfaces();
  return { success: "Empresa salva." };
}
