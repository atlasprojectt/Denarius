import "server-only";

import { randomBytes } from "node:crypto";
import { z } from "zod";

import {
  emailCodeHmac,
  generateEmailCode,
  sameHmac,
} from "@/lib/auth/email-code";

export const ACCOUNT_DELETION_CHALLENGE_COOKIE =
  "denarius-account-deletion-challenge";
export const ACCOUNT_DELETION_GRANT_COOKIE =
  "denarius-account-deletion-grant";
export const ACCOUNT_DELETION_TTL_SECONDS = 10 * 60;
export const ACCOUNT_DELETION_MAX_ATTEMPTS = 5;

export const accountDeletionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ACCOUNT_DELETION_TTL_SECONDS,
} as const;

export const accountDeletionRoleSchema = z.enum(["admin", "viewer"]);
export type AccountDeletionRole = z.infer<typeof accountDeletionRoleSchema>;

const challengeRowSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  user_id: z.uuid(),
  role: accountDeletionRoleSchema,
  target_name: z.string(),
  expected_phrase: z.string(),
  code_hash: z.string(),
  grant_hash: z.string().nullable(),
  attempts: z.number().int().min(0),
  expires_at: z.string(),
  verified_at: z.string().nullable(),
  consumed_at: z.string().nullable(),
  created_at: z.string(),
});

export type AccountDeletionChallenge = z.infer<typeof challengeRowSchema>;

export function parseAccountDeletionChallenge(
  value: unknown,
): AccountDeletionChallenge | null {
  const parsed = challengeRowSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export const generateDeletionCode = generateEmailCode;

export function generateDeletionGrant(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDeletionValue(
  kind: "code" | "grant",
  value: string,
): string {
  return emailCodeHmac(`account-deletion:${kind}`, value);
}

export const sameDeletionHash = sameHmac;

export function deletionPhrase(
  role: AccountDeletionRole,
  targetName: string,
): string {
  return role === "admin"
    ? `Eu confirmo a exclusão da empresa ${targetName}.`
    : `Eu excluo a minha conta, ${targetName}.`;
}

export function challengeIsOpen(
  challenge: AccountDeletionChallenge,
  now: Date,
): boolean {
  return (
    challenge.consumed_at === null &&
    Date.parse(challenge.expires_at) > now.getTime()
  );
}

export function challengeCanVerify(
  challenge: AccountDeletionChallenge,
  now: Date,
): boolean {
  return (
    challengeIsOpen(challenge, now) &&
    challenge.verified_at === null &&
    challenge.attempts < ACCOUNT_DELETION_MAX_ATTEMPTS
  );
}
