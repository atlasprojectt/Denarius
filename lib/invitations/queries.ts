import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { invitationState } from "./policy";

// Read path for the Usuários screen. RLS scopes the rows to the tenant; the
// live/dead split is the pure policy's call, not a query filter, so screen and
// accept route can never disagree about what "pending" means.

export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

type InvitationRow = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

export type InvitationLookup = {
  email: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  tenant: { name: string } | null;
};

/**
 * Public invite-page lookup. This uses the same Supabase store as the invite
 * actions; the separate Neon privileged connection is not part of this flow.
 */
export async function findInvitationByTokenHash(
  tokenHash: string,
): Promise<InvitationLookup | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("invitation")
      .select("email, expires_at, accepted_at, revoked_at, tenant:tenant_id(name)")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    return data as InvitationLookup | null;
  } catch {
    // A lookup failure has the same public result as an unknown token.
    return null;
  }
}

/** Invitations still waiting to be accepted — never the accepted, revoked or
 *  expired ones (an expired link is noise, not a pending task). */
export async function listPendingInvitations(): Promise<PendingInvitation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invitation")
    .select("id, email, role, expires_at, accepted_at, revoked_at")
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  const now = new Date();
  return ((data ?? []) as InvitationRow[])
    .filter(
      (row) =>
        invitationState(
          {
            expiresAt: row.expires_at,
            acceptedAt: row.accepted_at,
            revokedAt: row.revoked_at,
          },
          now,
        ) === "pending",
    )
    .map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      expiresAt: row.expires_at,
    }));
}
