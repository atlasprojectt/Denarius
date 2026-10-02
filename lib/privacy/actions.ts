"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAudit } from "@/lib/audit/log";
import {
  ACCOUNT_DELETION_REQUEST,
  ACCOUNT_DELETION_VERIFY,
  RATE_LIMITED_MESSAGE,
  hashSubject,
  takeRateLimitSlotFailClosed,
} from "@/lib/auth/rate-limit";
import { requireSession, type Session } from "@/lib/auth/session";
import { emailChannel } from "@/lib/notify/channel";
import { dbFailure, logFailure, logSkipped } from "@/lib/logging/server-log";
import { deleteTenantPermanently } from "@/lib/privacy/delete";
import { removeProfileAvatarObjects } from "@/lib/settings/avatar-storage";
import {
  ACCOUNT_DELETION_CHALLENGE_COOKIE,
  ACCOUNT_DELETION_GRANT_COOKIE,
  ACCOUNT_DELETION_MAX_ATTEMPTS,
  ACCOUNT_DELETION_TTL_SECONDS,
  accountDeletionCookieOptions,
  accountDeletionRoleSchema,
  challengeCanVerify,
  challengeIsOpen,
  deletionPhrase,
  generateDeletionCode,
  generateDeletionGrant,
  hashDeletionValue,
  parseAccountDeletionChallenge,
  sameDeletionHash,
  type AccountDeletionChallenge,
  type AccountDeletionRole,
} from "@/lib/privacy/deletion-challenge";
import { renderAccountDeletionCode } from "@/lib/privacy/deletion-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  accountDeletionCodeSchema,
  accountDeletionPhraseSchema,
  fieldErrorsOf,
} from "@/lib/validation";

export type AccountDeletionState = {
  step?: "sent" | "verified" | "complete" | "error";
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  phrase?: string;
};

const copy = {
  failed: "Não foi possível iniciar a exclusão agora. Tente novamente.",
  codeFailed: "Não foi possível enviar o código agora. Tente novamente.",
  codeInvalid: "Código inválido ou expirado. Confira o e-mail e tente novamente.",
  codeAttempts: "Por segurança, esse código foi bloqueado. Solicite outro.",
  phraseMismatch: "Digite a frase exatamente como ela aparece.",
  membershipFailed: "Não foi possível remover seu acesso agora. Tente novamente.",
  tenantMismatch: "O nome do espaço mudou. Reabra a exclusão e tente novamente.",
  credentialRevokeFailed:
    "Não foi possível descartar as credenciais dos provedores. Nada mais foi apagado.",
  tenantDeleteFailed:
    "A exclusão foi interrompida antes de remover o espaço. Fale com o suporte para concluir com segurança.",
};

const membershipSchema = z.object({
  tenant_id: z.uuid(),
  role: accountDeletionRoleSchema,
  display_name: z.string().nullable(),
  email: z.email(),
});

const tenantSchema = z.object({ name: z.string().min(1) });

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? copy.failed;
}

function deletionHash(
  kind: "code" | "grant",
  value: string,
): string | null {
  try {
    return hashDeletionValue(kind, value);
  } catch {
    return null;
  }
}

async function clearDeletionCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCOUNT_DELETION_CHALLENGE_COOKIE);
  cookieStore.delete(ACCOUNT_DELETION_GRANT_COOKIE);
}

async function currentChallenge(
  session: Session,
): Promise<AccountDeletionChallenge | null> {
  const cookieStore = await cookies();
  const challengeId = cookieStore.get(ACCOUNT_DELETION_CHALLENGE_COOKIE)?.value;
  if (!challengeId || !z.uuid().safeParse(challengeId).success) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_deletion_challenge")
    .select(
      "id, tenant_id, user_id, role, target_name, expected_phrase, code_hash, grant_hash, attempts, expires_at, verified_at, consumed_at, created_at",
    )
    .eq("id", challengeId)
    .eq("tenant_id", session.tenantId)
    .eq("user_id", session.userId)
    .eq("purpose", "account_deletion")
    .maybeSingle();
  if (error || !data) {
    if (error) logFailure("account_deletion.challenge_read", session.tenantId, dbFailure(error));
    return null;
  }
  return parseAccountDeletionChallenge(data);
}

async function deletionContext(session: Session): Promise<{
  role: AccountDeletionRole;
  email: string;
  targetName: string;
}> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user || user.id !== session.userId || !user.email) {
    throw new Error("authenticated user could not be resolved");
  }

  const admin = createAdminClient();
  const [{ data: membership, error: membershipError }, { data: tenant, error: tenantError }] =
    await Promise.all([
      admin
        .from("app_user")
        .select("tenant_id, role, display_name, email")
        .eq("id", session.userId)
        .eq("tenant_id", session.tenantId)
        .maybeSingle(),
      admin.from("tenant").select("name").eq("id", session.tenantId).maybeSingle(),
    ]);

  if (membershipError || tenantError || !membership || !tenant) {
    throw new Error("membership could not be resolved");
  }
  const parsedMembership = membershipSchema.safeParse(membership);
  const parsedTenant = tenantSchema.safeParse(tenant);
  if (!parsedMembership.success || !parsedTenant.success) {
    throw new Error("membership data is invalid");
  }

  const role = parsedMembership.data.role;
  const targetName =
    role === "admin"
      ? parsedTenant.data.name
      : parsedMembership.data.display_name?.trim() || user.email;
  return { role, email: user.email, targetName };
}

async function markChallengeConsumed(
  challengeId: string,
  session: Session,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("account_deletion_challenge")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challengeId)
    .eq("tenant_id", session.tenantId)
    .eq("user_id", session.userId)
    .is("consumed_at", null);
  if (error) logFailure("account_deletion.challenge_consume", session.tenantId, dbFailure(error));
}

export async function requestAccountDeletionCode(
  _previous: AccountDeletionState,
  _formData: FormData,
): Promise<AccountDeletionState> {
  const auth = await requireSession();
  if (auth.error !== undefined) return { step: "error", error: auth.error };
  const session = auth.session;

  let context: Awaited<ReturnType<typeof deletionContext>>;
  try {
    context = await deletionContext(session);
  } catch {
    logFailure("account_deletion.context", session.tenantId);
    return { step: "error", error: copy.failed };
  }

  const rateSubject = hashSubject(`${session.tenantId}:${session.userId}`);
  if (!(await takeRateLimitSlotFailClosed(ACCOUNT_DELETION_REQUEST, rateSubject))) {
    return { step: "error", error: RATE_LIMITED_MESSAGE };
  }

  const admin = createAdminClient();

  await admin
    .from("account_deletion_challenge")
    .update({ consumed_at: new Date().toISOString() })
    .eq("tenant_id", session.tenantId)
    .eq("user_id", session.userId)
    .eq("purpose", "account_deletion")
    .is("consumed_at", null);

  const challengeId = randomUUID();
  const code = generateDeletionCode();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + ACCOUNT_DELETION_TTL_SECONDS * 1000,
  ).toISOString();
  const phrase = deletionPhrase(context.role, context.targetName);
  const codeHash = deletionHash("code", `${challengeId}:${code}`);
  if (!codeHash) {
    logFailure("account_deletion.challenge_config", session.tenantId);
    return { step: "error", error: copy.codeFailed };
  }
  const { error: insertError } = await admin
    .from("account_deletion_challenge")
    .insert({
      id: challengeId,
      tenant_id: session.tenantId,
      user_id: session.userId,
      purpose: "account_deletion",
      role: context.role,
      target_name: context.targetName,
      expected_phrase: phrase,
      code_hash: codeHash,
      attempts: 0,
      expires_at: expiresAt,
    });
  if (insertError) {
    logFailure("account_deletion.challenge_create", session.tenantId, dbFailure(insertError));
    return { step: "error", error: copy.codeFailed };
  }

  const channel = emailChannel();
  if (!channel) {
    await markChallengeConsumed(challengeId, session);
    logSkipped("account_deletion.email", session.tenantId, { reason: "email_not_configured" });
    return { step: "error", error: copy.codeFailed };
  }
  const sent = await channel.send(renderAccountDeletionCode({ to: context.email, code }));
  if (!sent.ok) {
    await markChallengeConsumed(challengeId, session);
    logFailure("account_deletion.email", session.tenantId, { reason: sent.error });
    return { step: "error", error: copy.codeFailed };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACCOUNT_DELETION_CHALLENGE_COOKIE, challengeId, accountDeletionCookieOptions);
  cookieStore.delete(ACCOUNT_DELETION_GRANT_COOKIE);
  return { step: "sent", success: "Código enviado. Confira sua caixa de entrada." };
}

export async function verifyAccountDeletionCode(
  _previous: AccountDeletionState,
  formData: FormData,
): Promise<AccountDeletionState> {
  const parsed = accountDeletionCodeSchema.safeParse({ token: formData.get("code") });
  if (!parsed.success) return { step: "error", error: firstIssue(parsed.error), fieldErrors: fieldErrorsOf(parsed.error) };

  const auth = await requireSession();
  if (auth.error !== undefined) return { step: "error", error: auth.error };
  const session = auth.session;
  const rateSubject = hashSubject(`${session.tenantId}:${session.userId}`);
  if (!(await takeRateLimitSlotFailClosed(ACCOUNT_DELETION_VERIFY, rateSubject))) {
    return { step: "error", error: RATE_LIMITED_MESSAGE };
  }
  const challenge = await currentChallenge(session);
  if (!challenge || !challengeCanVerify(challenge, new Date())) {
    return { step: "error", error: copy.codeInvalid };
  }

  const admin = createAdminClient();
  const nextAttempts = challenge.attempts + 1;
  const { error: attemptError } = await admin
    .from("account_deletion_challenge")
    .update({ attempts: nextAttempts })
    .eq("id", challenge.id)
    .eq("tenant_id", session.tenantId)
    .eq("user_id", session.userId)
    .eq("attempts", challenge.attempts)
    .is("consumed_at", null);
  if (attemptError) {
    logFailure("account_deletion.attempt", session.tenantId, dbFailure(attemptError));
    return { step: "error", error: copy.codeInvalid };
  }

  const expected = deletionHash("code", `${challenge.id}:${parsed.data.token}`);
  if (!expected) {
    logFailure("account_deletion.verify_config", session.tenantId);
    return { step: "error", error: copy.codeInvalid };
  }
  if (!sameDeletionHash(challenge.code_hash, expected)) {
    if (nextAttempts >= ACCOUNT_DELETION_MAX_ATTEMPTS) {
      await markChallengeConsumed(challenge.id, session);
      const cookieStore = await cookies();
      cookieStore.delete(ACCOUNT_DELETION_CHALLENGE_COOKIE);
      cookieStore.delete(ACCOUNT_DELETION_GRANT_COOKIE);
      return { step: "error", error: copy.codeAttempts };
    }
    return { step: "error", error: copy.codeInvalid };
  }

  const grant = generateDeletionGrant();
  const grantHash = deletionHash("grant", `${challenge.id}:${grant}`);
  if (!grantHash) {
    logFailure("account_deletion.verify_config", session.tenantId);
    return { step: "error", error: copy.codeInvalid };
  }
  const { error: verifyError } = await admin
    .from("account_deletion_challenge")
    .update({ verified_at: new Date().toISOString(), grant_hash: grantHash })
    .eq("id", challenge.id)
    .eq("tenant_id", session.tenantId)
    .eq("user_id", session.userId)
    .is("verified_at", null)
    .is("consumed_at", null);
  if (verifyError) {
    logFailure("account_deletion.verify", session.tenantId, dbFailure(verifyError));
    return { step: "error", error: copy.codeInvalid };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACCOUNT_DELETION_GRANT_COOKIE, grant, accountDeletionCookieOptions);
  return { step: "verified", success: "E-mail confirmado.", phrase: challenge.expected_phrase };
}

async function verifiedChallenge(
  session: Session,
): Promise<AccountDeletionChallenge | null> {
  const challenge = await currentChallenge(session);
  if (!challenge || !challengeIsOpen(challenge, new Date()) || !challenge.verified_at || !challenge.grant_hash) return null;
  if (challenge.role !== session.role) return null;
  const cookieStore = await cookies();
  const grant = cookieStore.get(ACCOUNT_DELETION_GRANT_COOKIE)?.value;
  if (!grant) return null;
  const expected = deletionHash("grant", `${challenge.id}:${grant}`);
  if (!expected) return null;
  return sameDeletionHash(challenge.grant_hash, expected) ? challenge : null;
}

export async function confirmAccountDeletion(
  _previous: AccountDeletionState,
  formData: FormData,
): Promise<AccountDeletionState> {
  const parsed = accountDeletionPhraseSchema.safeParse({ phrase: formData.get("phrase") });
  if (!parsed.success) return { step: "error", error: firstIssue(parsed.error), fieldErrors: fieldErrorsOf(parsed.error) };

  const auth = await requireSession();
  if (auth.error !== undefined) return { step: "error", error: auth.error };
  const session = auth.session;
  const challenge = await verifiedChallenge(session);
  if (!challenge) return { step: "error", error: "A confirmação expirou. Solicite um novo código." };
  if (parsed.data.phrase !== challenge.expected_phrase) return { step: "error", error: copy.phraseMismatch };

  if (session.role === "viewer") {
    const admin = createAdminClient();
    if (!(await removeProfileAvatarObjects(admin, [session.userId]))) {
      logFailure("account_deletion.viewer_avatar_cleanup", session.tenantId);
      return { step: "error", error: copy.membershipFailed };
    }
    await recordAudit(session, "user.left", { target: "Membro", detail: { role: "viewer" } });
    const { count, error } = await admin
      .from("app_user")
      .delete({ count: "exact" })
      .eq("id", session.userId)
      .eq("tenant_id", session.tenantId)
      .eq("role", "viewer");
    if (error || count !== 1) {
      if (error) logFailure("account_deletion.viewer_membership", session.tenantId, dbFailure(error));
      return { step: "error", error: copy.membershipFailed };
    }
    await markChallengeConsumed(challenge.id, session);
    const client = await createClient();
    await client.auth.signOut();
    const cookieStore = await cookies();
    cookieStore.delete(ACCOUNT_DELETION_CHALLENGE_COOKIE);
    cookieStore.delete(ACCOUNT_DELETION_GRANT_COOKIE);
    redirect("/login?membership=left");
    return { step: "complete" };
  }

  const result = await deleteTenantPermanently({ actor: session, companyName: challenge.target_name });
  if (!result.ok) {
    if (result.reason === "name_mismatch") return { step: "error", error: copy.tenantMismatch };
    if (result.reason === "credential_revoke_failed") return { step: "error", error: copy.credentialRevokeFailed };
    if (result.reason === "auth_delete_failed" || result.reason === "tenant_delete_failed" || result.reason === "membership_read_failed" || result.reason === "avatar_cleanup_failed" || result.reason === "tenant_not_found") {
      return { step: "error", error: copy.tenantDeleteFailed };
    }
    return { step: "error", error: copy.failed };
  }
  await clearDeletionCookies();
  redirect("/login?space=deleted");
  return { step: "complete" };
}
