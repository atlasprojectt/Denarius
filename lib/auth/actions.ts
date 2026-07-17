"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  onboardingSchema,
  otpSchema,
  signupSchema,
} from "@/lib/validation";

export type AuthFormState = {
  error?: string;
  notice?: string;
  /** Signup landed but the e-mail still needs the 6-digit confirmation code —
   *  the UI opens the OTP dialog for `email`. */
  awaitingOtp?: boolean;
  email?: string;
};

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "E-mail ou senha incorretos." };

  redirect("/");
}

export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // Carried into auth metadata so onboarding can prefill the company name
    // (also covers the email-confirmation path, where this action's memory is gone).
    options: { data: { company_name: parsed.data.companyName } },
  });
  if (error) {
    if (error.code === "user_already_exists") {
      return { error: "Já existe uma conta com este e-mail. Faça login." };
    }
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  // With email confirmation enabled there is no session yet — the tenant is
  // created later by /onboarding on first authenticated visit.
  if (!data.session) {
    return {
      awaitingOtp: true,
      email: parsed.data.email,
      notice: "Conta criada. Enviamos um código de confirmação por e-mail.",
    };
  }

  redirect("/onboarding");
}

/** Confirms a fresh signup with the 6-digit code from the e-mail. On success
 *  the SSR client stores the session cookies, so the user lands signed in. */
export async function verifyEmailOtp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = otpSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "signup",
  });
  if (error) return { error: "Código inválido ou expirado." };

  redirect("/onboarding");
}

export async function resendSignupCode(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Não foi possível reenviar o código." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.data,
  });
  if (error) return { error: "Não foi possível reenviar o código." };

  return { notice: "Código reenviado. Confira seu e-mail." };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Creates the tenant + Admin app_user + the Unattributed team for a signed-in
 * user that has no tenant yet. Uses the service-role client deliberately:
 * RLS (correctly) forbids an orphan user from inserting into these tables.
 */
export async function completeOnboarding(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = onboardingSchema.safeParse({
    companyName: formData.get("companyName"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("app_user")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) redirect("/");

  const { data: tenant, error: tenantError } = await admin
    .from("tenant")
    .insert({ name: parsed.data.companyName })
    .select("id")
    .single();
  if (tenantError) {
    return { error: "Não foi possível criar a empresa. Tente novamente." };
  }

  const { error: userError } = await admin.from("app_user").insert({
    id: user.id,
    tenant_id: tenant.id,
    email: user.email,
    role: "admin",
  });
  if (userError) {
    await admin.from("tenant").delete().eq("id", tenant.id);
    return { error: "Não foi possível concluir o cadastro. Tente novamente." };
  }

  // Internal name — the UI renders this bucket from the flag, not the string.
  await admin.from("team").insert({
    tenant_id: tenant.id,
    name: "unattributed",
    is_unattributed: true,
  });

  redirect("/");
}
