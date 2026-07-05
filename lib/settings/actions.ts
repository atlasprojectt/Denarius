"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { companySettingsSchema, profileNameSchema } from "@/lib/validation";

export type SettingsFormState = { error?: string; success?: string };

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

function revalidateAccountSurfaces() {
  revalidatePath("/configuracoes");
  revalidatePath("/ajustes");
  revalidatePath("/", "layout");
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

  revalidateAccountSurfaces();
  return { success: "Empresa salva." };
}
