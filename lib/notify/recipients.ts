// Denarius — recipient selection (pure, no I/O). Event alerts and the weekly
// digest go to tenant Admins (PRD P4/story 53); the digest additionally honors
// the per-user opt-out. Viewers never receive email.

export type NotifiableUser = {
  email: string;
  role: string;
  digestOptOut: boolean;
};

/** Event alerts: every Admin. No opt-out — this is the early-warning channel. */
export function alertRecipients(users: NotifiableUser[]): string[] {
  return users.filter((u) => u.role === "admin").map((u) => u.email);
}

/** Weekly digest: Admins, default on, minus those who opted out. */
export function digestRecipients(users: NotifiableUser[]): string[] {
  return users
    .filter((u) => u.role === "admin" && !u.digestOptOut)
    .map((u) => u.email);
}
