import "server-only";

import { createClient } from "@/lib/supabase/server";

/** `email` is carried so an administrative action can snapshot its actor on the
 *  audit entry (#73): app_user rows get deleted, and a departure must not blank
 *  every action that person ever took. */
export type Session = {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
};

type RequireResult =
  | { session: Session; error?: undefined }
  | { session?: undefined; error: string };

type ResolveResult =
  | { session: Session; error?: undefined; authenticated: true }
  | { session?: undefined; error: string; authenticated: boolean };

async function resolveSession(): Promise<ResolveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "Sessão expirada — faça login novamente.",
      authenticated: false,
    };
  }

  const { data } = await supabase
    .from("app_user")
    .select("tenant_id, role, email")
    .eq("id", user.id)
    .maybeSingle();
  const row = data as { tenant_id: string; role: string; email: string } | null;
  if (!row) {
    return {
      error: "Cadastro incompleto — conclua o onboarding.",
      authenticated: true,
    };
  }
  return {
    session: {
      userId: user.id,
      tenantId: row.tenant_id,
      role: row.role,
      // The app_user row, not the auth user: it is the membership record, and
      // it is the address the rest of the product already shows.
      email: row.email,
    },
    authenticated: true,
  };
}

/**
 * Server-action guard: resolves the signed-in user's tenant + role and requires
 * the admin role. The single source of this check — reused by every admin-only
 * mutation (roster, subscriptions) so the rule is never duplicated (Layer 3 §9).
 */
export async function requireAdmin(): Promise<RequireResult> {
  const result = await resolveSession();
  if (result.error !== undefined) {
    return { error: result.error };
  }
  if (result.session.role !== "admin") {
    return { error: "Somente administradores podem fazer esta alteração." };
  }
  return { session: result.session };
}

/** Resolves a complete signed-in membership without imposing a role. Use this
 * at authenticated read/API edges that are shared by Admins and Viewers. */
export async function requireSession(): Promise<RequireResult> {
  const result = await resolveSession();
  if (result.error !== undefined) return { error: result.error };
  return { session: result.session };
}

/**
 * Page-level guard for display gating (not mutations — requireAdmin remains
 * the authority there). Returns the role, defaulting to "viewer" when the
 * app_user row isn't resolved yet, or null when there's no signed-in user at
 * all — callers that need a hard redirect keep doing their own user check.
 */
export async function currentRole(): Promise<string | null> {
  const result = await resolveSession();
  if (!result.authenticated) return null;
  return result.session?.role ?? "viewer";
}
