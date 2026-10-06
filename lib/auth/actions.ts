"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { emailChannel } from "@/lib/notify/channel";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dbFailure, logFailure, logSkipped } from "@/lib/logging/server-log";
import {
  fieldErrorsOf,
  loginSchema,
  onboardingSchema,
  otpSchema,
  signupSchema,
} from "@/lib/validation";

import { generateEmailCode } from "./email-code";
import { requestOrigin } from "./origin";
import {
  hasPasswordIdentity,
  passwordSchema,
  weakPasswordError,
  withConfirmation,
} from "./password";
import {
  clearPasswordChangeChallenge,
  passwordChangeCodeMatches,
  readPasswordChangeChallenge,
  sealPasswordChangeChallenge,
  storePasswordChangeChallenge,
} from "./password-change";
import { renderPasswordChangeCode } from "./password-change-email";
import {
  PASSWORD_CHANGE_REQUEST,
  PASSWORD_CHANGE_VERIFY,
  RATE_LIMITED_MESSAGE,
  hashSubject,
  takeRateLimitSlotFailClosed,
} from "./rate-limit";
import {
  RECOVERY_PATH,
  RECOVERY_RESPONSE_FLOOR_MS,
  clearRecoveryGrant,
  hasRecoveryGrant,
} from "./recovery";

/** Signup carries the product's password rule (#58) — the shared schema is the
 *  only place the minimum is written, so this overrides the placeholder in
 *  `lib/validation.ts` rather than restating a number. */
const signupWithPasswordRule = signupSchema.extend({ password: passwordSchema });

export type AuthFormState = {
  error?: string;
  /** First message per field, so the UI marks the exact input (#58: the
   *  password rule must fail ON the password field, not as a form error). */
  fieldErrors?: Record<string, string>;
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
  if (error) {
    logSkipped("auth.login", null, { code: error.code ?? "unknown" });
    return { error: "E-mail ou senha incorretos." };
  }

  redirect("/");
}

export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupWithPasswordRule.safeParse({
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      error: firstIssue(parsed.error),
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

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
    // Supabase refused the password itself — leaked-password protection or the
    // project's own minimum. Surfaced on the field, never as a generic failure.
    const weak = weakPasswordError(error);
    if (weak) return weak;
    logFailure("auth.signup", null, dbFailure(error));
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  // With email confirmation enabled there is no session yet — the tenant is
  // created later by /configuracao on first authenticated visit.
  if (!data.session) {
    return {
      awaitingOtp: true,
      email: parsed.data.email,
      notice: "Conta criada. Enviamos um código de confirmação por e-mail.",
    };
  }

  redirect("/configuracao");
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
  if (error) {
    logSkipped("auth.verify_otp", null, { code: error.code ?? "unknown" });
    return { error: "Código inválido ou expirado." };
  }

  redirect("/configuracao");
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
  if (error) {
    logFailure("auth.resend_otp", null, dbFailure(error));
    return { error: "Não foi possível reenviar o código." };
  }

  return { notice: "Código reenviado. Confira seu e-mail." };
}

const recoveryRequestSchema = z.object({
  email: z.email("Informe um e-mail válido."),
});

const recoveryResetSchema = withConfirmation({});

/** One answer for every address (issue #68). Kept as a constant so no branch
 *  can accidentally grow a second, more informative one. */
const RECOVERY_REQUESTED_NOTICE =
  "Se existir uma conta com este e-mail, o link de redefinição já está a caminho. Confira sua caixa de entrada e o spam.";

const RECOVERY_LINK_DEAD =
  "Este link de redefinição expirou ou já foi usado. Peça um novo para continuar.";

async function holdUntilFloor(startedAt: number): Promise<void> {
  const remaining = RECOVERY_RESPONSE_FLOOR_MS - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

/**
 * Ask Supabase for a recovery link (issue #68).
 *
 * **Every submission returns the identical notice** — registered address,
 * unknown address, or a failed send. This endpoint is public, so a response
 * that differed would be an account-enumeration oracle: anyone could harvest
 * which of a list of e-mails have accounts here. The provider's error is
 * deliberately discarded rather than inspected.
 *
 * The link lands on `/auth/callback`, which exchanges the PKCE code and stamps
 * the recovery grant before handing off to the reset page.
 *
 * The reply is also held to a fixed floor, so the two answers match in duration
 * and not only in wording — see `RECOVERY_RESPONSE_FLOOR_MS`.
 */
export async function requestPasswordRecovery(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = recoveryRequestSchema.safeParse({
    email: formData.get("email"),
  });
  // A malformed address is refused before the clock starts: that answer is
  // about the shape of what was typed, not about whether an account exists, so
  // it discloses nothing and does not need the floor.
  if (!parsed.success) {
    return {
      error: firstIssue(parsed.error),
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const startedAt = Date.now();
  const supabase = await createClient();
  const redirectTo = `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(RECOVERY_PATH)}`;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  });
  if (error) logFailure("auth.recovery_request", null, dbFailure(error));
  await holdUntilFloor(startedAt);

  return { notice: RECOVERY_REQUESTED_NOTICE };
}

/**
 * Set the new password from the recovery link (issue #68). Requires both the
 * recovery grant stamped by the callback and a live session — a plain session
 * is not enough, or a stolen cookie would be a password change with no current
 * password (see `lib/auth/recovery.ts`).
 */
export async function resetPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!(await hasRecoveryGrant())) return { error: RECOVERY_LINK_DEAD };

  const parsed = recoveryResetSchema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    return {
      error: firstIssue(parsed.error),
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) logFailure("auth.password_reset", null, dbFailure(userError));
  if (!user) return { error: RECOVERY_LINK_DEAD };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    const weak = weakPasswordError(error);
    if (weak) return weak;
    logFailure("auth.password_reset", null, dbFailure(error));
    return { error: "Não foi possível alterar a senha. Tente novamente." };
  }

  // Whoever started this recovery — the owner or an attacker — the other side's
  // sessions must not survive it. The current session stays signed in.
  await supabase.auth.signOut({ scope: "others" });
  await clearRecoveryGrant();

  redirect("/");
}

const changePasswordSchema = withConfirmation({ code: otpSchema.shape.token });

const CHANGE_SESSION_GONE =
  "Sua sessão expirou. Entre novamente para trocar a senha.";
const CHANGE_GOOGLE_ONLY =
  "Você entra no Denarius pela sua conta Google, então não há senha do Denarius para trocar.";
const CHANGE_CODE_SENT = "Código enviado. Confira sua caixa de entrada.";
const CHANGE_CODE_SEND_FAILED =
  "Não foi possível enviar o código agora. Tente novamente.";
const CHANGE_CODE_INVALID =
  "Código inválido ou expirado. Confira o e-mail ou peça um novo código.";
const CHANGE_SAME_PASSWORD = "A nova senha precisa ser diferente da atual.";
const CHANGE_FAILED = "Não foi possível alterar a senha. Tente novamente.";
const CHANGE_DONE =
  "Senha alterada. As outras sessões da sua conta foram encerradas.";

/**
 * The signed-in account a password change applies to. A Google-only account
 * has no password to change, so it is refused with an explanation rather than
 * a failure that would read as a typo. The screen hides the form for those
 * accounts; both actions refuse again, because a server action never trusts
 * the UI that called it.
 */
async function passwordAccount() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) logFailure("auth.password_change", null, dbFailure(userError));
  if (!user?.email) return { error: CHANGE_SESSION_GONE };
  if (!hasPasswordIdentity(user)) return { error: CHANGE_GOOGLE_ONLY };
  return { supabase, userId: user.id, email: user.email };
}

/**
 * Step one of changing your own password on /preferencias: e-mail a six-digit
 * code to the account's address (`lib/auth/password-change.ts` explains why the
 * code replaced the current-password check of issue #69).
 *
 * Every leg fails closed — limiter, missing mail channel, failed send — because
 * an unthrottled sender is a mailer aimed at our own customer, and a cookie for
 * a code that never left would leave the person waiting for nothing.
 */
export async function requestPasswordChangeCode(
  _prev: AuthFormState,
  _formData: FormData,
): Promise<AuthFormState> {
  const account = await passwordAccount();
  if ("error" in account) return { error: account.error };

  const subject = hashSubject(account.userId);
  if (!(await takeRateLimitSlotFailClosed(PASSWORD_CHANGE_REQUEST, subject))) {
    return { error: RATE_LIMITED_MESSAGE };
  }

  const channel = emailChannel();
  if (!channel) {
    logSkipped("auth.password_change_code", null, { reason: "email_not_configured" });
    return { error: CHANGE_CODE_SEND_FAILED };
  }

  const code = generateEmailCode();
  let sealed: string;
  try {
    sealed = sealPasswordChangeChallenge(account.userId, code, new Date());
  } catch {
    logFailure("auth.password_change_code", null, { reason: "hmac_not_configured" });
    return { error: CHANGE_CODE_SEND_FAILED };
  }

  const sent = await channel.send(
    renderPasswordChangeCode({ to: account.email, code }),
  );
  if (!sent.ok) {
    logFailure("auth.password_change_code", null, { reason: sent.error });
    return { error: CHANGE_CODE_SEND_FAILED };
  }

  await storePasswordChangeChallenge(sealed);
  return { notice: CHANGE_CODE_SENT };
}

/**
 * Step two: the e-mailed code and the new password, in one action.
 *
 * `updateUser` checks nothing about the caller, so without the code an unlocked
 * laptop or a stolen session cookie is a permanent account takeover. Ordering is
 * load-bearing and asserted: schema → limiter → code → update → evict, so a
 * rejected attempt has changed nothing. The challenge survives a refused
 * *password* (leaked, same as the old one) so the person can pick another one
 * without a new e-mail; it is burned only on success.
 */
export async function changePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const account = await passwordAccount();
  if ("error" in account) return { error: account.error };

  const parsed = changePasswordSchema.safeParse({
    code: formData.get("code"),
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    return {
      error: firstIssue(parsed.error),
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const subject = hashSubject(account.userId);
  if (!(await takeRateLimitSlotFailClosed(PASSWORD_CHANGE_VERIFY, subject))) {
    return { error: RATE_LIMITED_MESSAGE };
  }

  let codeMatches = false;
  try {
    codeMatches = passwordChangeCodeMatches(
      await readPasswordChangeChallenge(),
      account.userId,
      parsed.data.code,
      new Date(),
    );
  } catch {
    logFailure("auth.password_change", null, { reason: "hmac_not_configured" });
  }
  if (!codeMatches) {
    return {
      error: CHANGE_CODE_INVALID,
      fieldErrors: { code: CHANGE_CODE_INVALID },
    };
  }

  const { error } = await account.supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === "same_password") {
      return {
        error: CHANGE_SAME_PASSWORD,
        fieldErrors: { password: CHANGE_SAME_PASSWORD },
      };
    }
    const weak = weakPasswordError(error);
    if (weak) return weak;
    logFailure("auth.password_change", null, dbFailure(error));
    return { error: CHANGE_FAILED };
  }

  // Changing a password is also how someone evicts whoever else is holding a
  // session on this account. The current session stays signed in.
  await account.supabase.auth.signOut({ scope: "others" });
  await clearPasswordChangeChallenge();

  return { notice: CHANGE_DONE };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) logFailure("auth.logout", null, dbFailure(error));
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
    error: userReadError,
  } = await supabase.auth.getUser();
  if (userReadError) logFailure("onboarding.complete", null, dbFailure(userReadError));
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
    logFailure("onboarding.complete", null, {
      step: "create_tenant",
      ...dbFailure(tenantError),
    });
    return { error: "Não foi possível criar a empresa. Tente novamente." };
  }

  const { error: userError } = await admin.from("app_user").insert({
    id: user.id,
    tenant_id: tenant.id,
    email: user.email,
    role: "admin",
  });
  if (userError) {
    const { error: rollbackError } = await admin.from("tenant").delete().eq("id", tenant.id);
    logFailure("onboarding.complete", tenant.id, {
      step: "create_admin",
      rollbackCode: rollbackError?.code ?? null,
      ...dbFailure(userError),
    });
    return { error: "Não foi possível concluir o cadastro. Tente novamente." };
  }

  // Internal name — the UI renders this bucket from the flag, not the string.
  const { error: teamError } = await admin.from("team").insert({
    tenant_id: tenant.id,
    name: "unattributed",
    is_unattributed: true,
  });
  if (teamError) {
    // Keep onboarding retryable: deleting the tenant cascades the app_user row
    // but deliberately leaves the authenticated identity in auth.users.
    const { error: rollbackError } = await admin.from("tenant").delete().eq("id", tenant.id);
    logFailure("onboarding.complete", tenant.id, {
      step: "create_unattributed",
      rollbackCode: rollbackError?.code ?? null,
      ...dbFailure(teamError),
    });
    return { error: "Não foi possível concluir o cadastro. Tente novamente." };
  }

  // The tenant exists; the guided setup continues on the same card.
  redirect("/configuracao");
}
