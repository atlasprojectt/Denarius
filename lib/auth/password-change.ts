import "server-only";

import { cookies } from "next/headers";

import { emailCodeHmac, sameHmac } from "./email-code";
import { EMAIL_CODE_TTL_MINUTES } from "./email-code-policy";

/**
 * Password change by e-mail code (founder direction, 2026-10-05).
 *
 * A live session alone must not be enough to change the password — an unlocked
 * laptop or a stolen cookie would make the session *be* the password. The proof
 * is a six-digit code sent to the account's address: the same root of trust the
 * recovery link already relies on, so this adds no weaker door.
 *
 * The pending challenge is one httpOnly cookie, `<expiresAtMs>.<hmac>`, with the
 * HMAC binding user, expiry and code. There is no table because the change
 * completes in a single action — nothing to persist between steps — and the
 * cookie is not a secret worth stealing: without the server key it cannot be
 * brute-forced offline, and online guesses go through the verify rate limit.
 * Requesting a new code overwrites the cookie, so earlier codes stop working.
 */
export const PASSWORD_CHANGE_COOKIE = "denarius-password-change";

export const PASSWORD_CHANGE_TTL_SECONDS = EMAIL_CODE_TTL_MINUTES * 60;

const NAMESPACE = "password-change";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: PASSWORD_CHANGE_TTL_SECONDS,
} as const;

function challengeMac(userId: string, expiresAt: number, code: string): string {
  return emailCodeHmac(NAMESPACE, `${userId}:${expiresAt}:${code}`);
}

export function sealPasswordChangeChallenge(
  userId: string,
  code: string,
  now: Date,
): string {
  const expiresAt = now.getTime() + PASSWORD_CHANGE_TTL_SECONDS * 1000;
  return `${expiresAt}.${challengeMac(userId, expiresAt, code)}`;
}

export function passwordChangeCodeMatches(
  sealed: string | undefined,
  userId: string,
  code: string,
  now: Date,
): boolean {
  const match = /^(\d{13})\.([0-9a-f]{64})$/.exec(sealed ?? "");
  if (!match) return false;
  const expiresAt = Number(match[1]);
  if (expiresAt <= now.getTime()) return false;
  return sameHmac(match[2], challengeMac(userId, expiresAt, code));
}

export async function storePasswordChangeChallenge(sealed: string): Promise<void> {
  const store = await cookies();
  store.set(PASSWORD_CHANGE_COOKIE, sealed, cookieOptions);
}

export async function readPasswordChangeChallenge(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(PASSWORD_CHANGE_COOKIE)?.value;
}

export async function clearPasswordChangeChallenge(): Promise<void> {
  const store = await cookies();
  store.delete(PASSWORD_CHANGE_COOKIE);
}
