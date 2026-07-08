// Denarius — privacy policy (pure, no I/O). The single source of the trust
// rules (PRD P7, stories 54–56): who may see individual names, and the guard
// for removing a user. "Control, not surveillance" (product principle #1) is
// enforced HERE and injected into the data layer — never left to the UI alone.

export type NameVisibility = {
  /** The viewer's role. */
  role: string;
  /** Tenant "who can see individual names" switch (Admin-only by default). */
  showNames: boolean;
};

/**
 * True only when an Admin views a tenant that has names enabled. Viewers never
 * see names (hard rule); turning the tenant switch off hides names even for
 * Admins (data minimization on the display side). Everything else — team
 * aggregates, costs — is unaffected.
 */
export function canSeeNames({ role, showNames }: NameVisibility): boolean {
  return role === "admin" && showNames;
}

/** Anonymous label for a person row when names may not be shown. Stable by
 *  position so the same drill-down reads consistently within a render. */
export function anonymousLabel(index: number): string {
  return `Colaborador ${index + 1}`;
}

/**
 * Admins may remove any user in their tenant EXCEPT themselves — removing your
 * own row mid-session would lock the tenant's last admin out. Same-tenant
 * scoping is enforced separately at the query (RLS + explicit tenant filter).
 */
export function canRemoveUser(input: {
  actorRole: string;
  actorId: string;
  targetId: string;
}): boolean {
  return input.actorRole === "admin" && input.actorId !== input.targetId;
}
