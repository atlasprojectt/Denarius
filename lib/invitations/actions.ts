"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requestOrigin } from "@/lib/auth/origin";
import { passwordSchema, weakPasswordError } from "@/lib/auth/password";
import {
  INVITE_ACCEPT,
  INVITE_CREATE,
  RATE_LIMITED_MESSAGE,
  clientFingerprint,
  takeRateLimitSlot,
} from "@/lib/auth/rate-limit";
import { requireAdmin } from "@/lib/auth/session";
import { emailChannel } from "@/lib/notify/channel";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  acceptInvitationSchema,
  fieldErrorsOf,
  inviteUserSchema,
  invitationRevokeSchema,
} from "@/lib/validation";

import { renderInvite } from "./email";
import { expiryFrom, isUsable } from "./policy";
import { generateToken, hashToken } from "./token";

/** Accepting an invite IS a signup, so it carries the product's password rule
 *  (#58) from the one place that owns it. */
const acceptWithPasswordRule = acceptInvitationSchema.extend({
  password: passwordSchema,
});

export type InviteFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
  /** The one-time link. Shown to the Admin because the token is hashed at rest:
   *  this is the only moment it can be read, and email delivery may be off. */
  inviteUrl?: string;
  /** Whether the invite was also emailed (false when no channel is configured). */
  emailed?: boolean;
};

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

/**
 * Invite a colleague by email with a role (PRD story #2). Admin-only.
 *
 * The invitation — not auth metadata — carries the tenant and the role, so an
 * invitee cannot promote themselves. Delivery is best-effort: the row and the
 * link exist regardless, and the Admin can always hand the link over directly.
 */
export async function inviteUser(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  // Keyed by tenant, not by Admin: the sending reputation being spent belongs
  // to the space, and a second Admin account is a trivial way around a per-user
  // key (#61).
  if (!(await takeRateLimitSlot(INVITE_CREATE, auth.session.tenantId))) {
    return { error: RATE_LIMITED_MESSAGE };
  }

  const parsed = inviteUserSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: firstIssue(parsed.error), fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const { email, role } = parsed.data;

  const admin = createAdminClient();

  // Already inside this tenant → nothing to invite.
  const { data: existing } = await admin
    .from("app_user")
    .select("id")
    .eq("tenant_id", auth.session.tenantId)
    .ilike("email", email)
    .maybeSingle();
  if (existing) {
    return {
      error: "Esta pessoa já tem acesso a este espaço.",
      fieldErrors: { email: "Já tem acesso." },
    };
  }

  const now = new Date();
  const token = generateToken();

  const { error } = await admin
    .from("invitation")
    .insert({
      tenant_id: auth.session.tenantId,
      email,
      role,
      token_hash: hashToken(token),
      invited_by: auth.session.userId,
      expires_at: expiryFrom(now),
    });

  if (error) {
    // The partial unique index (one live invite per address) is the only
    // conflict a valid submit can hit.
    if (error.code === "23505") {
      return {
        error: "Já existe um convite pendente para este e-mail. Revogue-o para gerar outro link.",
        fieldErrors: { email: "Convite já pendente." },
      };
    }
    return { error: "Não foi possível criar o convite. Tente novamente." };
  }

  const inviteUrl = `${await requestOrigin()}/convite/${token}`;

  // Best-effort delivery. A send failure must not lose the invite: the row is
  // already there and the link is returned either way.
  let emailed = false;
  const channel = emailChannel();
  if (channel) {
    const { data: tenant } = await admin
      .from("tenant")
      .select("name")
      .eq("id", auth.session.tenantId)
      .maybeSingle();
    const result = await channel.send(
      renderInvite({
        to: email,
        companyName: (tenant as { name: string } | null)?.name ?? "sua empresa",
        role,
        inviteUrl,
      }),
    );
    emailed = result.ok;
  }

  revalidatePath("/ajustes/usuarios");
  return {
    success: emailed ? `Convite enviado para ${email}.` : `Convite criado para ${email}.`,
    inviteUrl,
    emailed,
  };
}

/** Revoke a pending invitation — the link dies immediately. Admin-only. */
export async function revokeInvitation(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = invitationRevokeSchema.safeParse({
    invitationId: formData.get("invitationId"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const admin = createAdminClient();
  // Tenant-scoped: an id from another tenant matches nothing. Idempotent — a
  // repeated submit reports the end state instead of an error.
  const { error, count } = await admin
    .from("invitation")
    .update({ revoked_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", parsed.data.invitationId)
    .eq("tenant_id", auth.session.tenantId)
    .is("accepted_at", null)
    .is("revoked_at", null);

  if (error) return { error: "Não foi possível revogar o convite. Tente novamente." };

  revalidatePath("/ajustes/usuarios");
  return {
    success: count === 1 ? "Convite revogado." : "Este convite já não está mais válido.",
  };
}

/**
 * Accept an invitation: create the account and join the inviting tenant with
 * the role the Admin chose. Runs UNAUTHENTICATED — the token is the proof, so
 * every check happens here on the service role.
 */
export async function acceptInvitation(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  // Before the token is even read: this route is public and takes a credential
  // in the path, so an unthrottled attempt is both a brute-force surface and a
  // cheap way to make every request hit the database. Keyed by caller, never by
  // token — a limit that keyed on the token would be a probe telling the prober
  // it had found a real one (#61).
  if (!(await takeRateLimitSlot(INVITE_ACCEPT, await clientFingerprint()))) {
    return { error: RATE_LIMITED_MESSAGE };
  }

  const parsed = acceptWithPasswordRule.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: firstIssue(parsed.error), fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("invitation")
    .select("id, tenant_id, email, role, expires_at, accepted_at, revoked_at")
    .eq("token_hash", hashToken(parsed.data.token))
    .maybeSingle();
  const invitation = data as {
    id: string;
    tenant_id: string;
    email: string;
    role: string;
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
  } | null;

  // One message for "no such token" and "dead token": a probe learns nothing
  // about which invitations exist.
  const dead = { error: "Este convite não é mais válido. Peça um novo ao administrador." };
  if (!invitation) return dead;
  if (
    !isUsable(
      {
        expiresAt: invitation.expires_at,
        acceptedAt: invitation.accepted_at,
        revokedAt: invitation.revoked_at,
      },
      new Date(),
    )
  ) {
    return dead;
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: invitation.email,
      password: parsed.data.password,
      // The token was mailed to this address — it IS the proof of ownership.
      email_confirm: true,
    });

  if (createError || !created.user) {
    // The password rule also holds on this path (the admin API applies the
    // project's leaked-password protection) — report it on the field.
    const weak = weakPasswordError(createError);
    if (weak) return weak;
    if (createError?.code === "email_exists") {
      return {
        error:
          "Este e-mail já tem uma conta no Denarius. Faça login com ela — um e-mail pertence a um único espaço.",
      };
    }
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  const { error: userError } = await admin.from("app_user").insert({
    id: created.user.id,
    tenant_id: invitation.tenant_id,
    email: invitation.email,
    role: invitation.role,
  });
  if (userError) {
    // Never strand an auth user with no tenant: they would land on /onboarding
    // and create a second company out of an invitation.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Não foi possível concluir o convite. Tente novamente." };
  }

  // Burn the token only after the membership exists.
  await admin
    .from("invitation")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invitation.email,
    password: parsed.data.password,
  });
  // The account exists either way — send them to the door rather than fail.
  if (signInError) redirect("/login");

  redirect("/");
}
