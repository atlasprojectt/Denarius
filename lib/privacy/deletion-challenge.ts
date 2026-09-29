import "server-only";

import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";

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

function deletionSecret(): string {
  const secret =
    process.env.ACCOUNT_DELETION_HMAC_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Account deletion verification is not configured.");
  }
  return secret;
}

export function generateDeletionCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function generateDeletionGrant(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDeletionValue(
  kind: "code" | "grant",
  value: string,
): string {
  return createHmac("sha256", deletionSecret())
    .update(`account-deletion:${kind}:${value}`)
    .digest("hex");
}

export function sameDeletionHash(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

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
