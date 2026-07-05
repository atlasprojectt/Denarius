export function profileLabel(input: {
  displayName: string | null;
  email: string;
}): string {
  const name = input.displayName?.trim();
  return name && name.length > 0 ? name : input.email;
}

export function profileInitials(input: {
  displayName: string | null;
  email: string;
}): string {
  const label = profileLabel(input);
  const parts = label
    .replace(/@.*/, "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${second}`.toUpperCase();
}

export function canEditCompanySettings(role: string): boolean {
  return role === "admin";
}

export function canEditProfileName(input: {
  sessionUserId: string;
  targetUserId: string;
}): boolean {
  return input.sessionUserId === input.targetUserId;
}
