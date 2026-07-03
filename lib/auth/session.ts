import "server-only";

import { createClient } from "@/lib/supabase/server";

export type Session = { userId: string; tenantId: string; role: string };

type RequireResult =
  | { session: Session; error?: undefined }
  | { session?: undefined; error: string };

/**
 * Server-action guard: resolves the signed-in user's tenant + role and requires
 * the admin role. The single source of this check — reused by every admin-only
 * mutation (roster, subscriptions) so the rule is never duplicated (Layer 3 §9).
 */
export async function requireAdmin(): Promise<RequireResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const { data } = await supabase
    .from("app_user")
    .select("tenant_id, role")
    .eq("id", user.id)
    .maybeSingle();
  const row = data as { tenant_id: string; role: string } | null;
  if (!row) return { error: "Cadastro incompleto — conclua o onboarding." };
  if (row.role !== "admin") {
    return { error: "Somente administradores podem fazer esta alteração." };
  }
  return {
    session: { userId: user.id, tenantId: row.tenant_id, role: row.role },
  };
}
