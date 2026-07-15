// Denarius — invitation rules (pure, no I/O). The state of an invitation is
// derived, never a stored status column: a row that is neither accepted nor
// revoked simply expires by the clock. One source of truth for both the accept
// route (which must refuse a dead link) and the Usuários screen (which lists
// the live ones).

export const INVITE_TTL_DAYS = 7;

export type InvitationRecord = {
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
};

export type InvitationState = "pending" | "accepted" | "revoked" | "expired";

/** Precedence is the order things actually happened: an accepted invitation
 *  stays "accepted" even once its clock runs out. */
export function invitationState(
  invitation: InvitationRecord,
  now: Date,
): InvitationState {
  if (invitation.acceptedAt !== null) return "accepted";
  if (invitation.revokedAt !== null) return "revoked";
  if (new Date(invitation.expiresAt).getTime() <= now.getTime()) return "expired";
  return "pending";
}

export function isUsable(invitation: InvitationRecord, now: Date): boolean {
  return invitationState(invitation, now) === "pending";
}

/** The expiry stamp for a new invitation — TTL from the moment it is issued. */
export function expiryFrom(now: Date): string {
  return new Date(
    now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}
