import "server-only";

import { cookies } from "next/headers";

/**
 * Password recovery grant (issue #68).
 *
 * The recovery link arrives as a PKCE code on `/auth/callback`, which exchanges
 * it for an ordinary session — and an ordinary session is exactly what an
 * attacker holding a stolen cookie also has. Without a marker, the reset page
 * would let anyone with a live session set a new password **without knowing the
 * current one**, which is precisely the takeover #69 verifies against.
 *
 * So the callback stamps a short-lived, httpOnly cookie when (and only when) it
 * just exchanged a recovery link, the reset page requires it, and the reset
 * action burns it. It carries no secret — it is a "you arrived through the
 * e-mail link, minutes ago" marker, and the session still does the authorizing.
 */
export const RECOVERY_COOKIE = "denarius-recovery";

/** Long enough to choose a password, short enough that a shared machine does
 *  not keep the door open. */
export const RECOVERY_TTL_SECONDS = 15 * 60;

export const RECOVERY_PATH = "/auth/nova-senha";

/**
 * Minimum wall time for a recovery request, so the answer is identical in
 * DURATION as well as in content (issue #68 asks for both).
 *
 * Supabase does strictly more work for an address that exists — it renders and
 * sends an e-mail — and measuring it here showed the difference reaching the
 * caller: a registered address took ~250ms against ~80ms for an unknown one.
 * Byte-identical copy in front of a timing gap is still an enumeration oracle,
 * just a slower one to exploit.
 *
 * A floor rather than fire-and-forget: on a serverless runtime a promise left
 * unawaited can be killed when the response is sent, which would silently stop
 * sending the very e-mail this action exists to send. The floor sits above the
 * slow case so both paths land on it.
 *
 * It lives here rather than beside the action because `lib/auth/actions.ts` is
 * a `"use server"` module, and such a module may export nothing but async
 * functions — a constant export there makes Next drop every export in the file
 * at build time.
 */
export const RECOVERY_RESPONSE_FLOOR_MS = 900;

export const recoveryCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: RECOVERY_TTL_SECONDS,
} as const;

export async function hasRecoveryGrant(): Promise<boolean> {
  const store = await cookies();
  return store.get(RECOVERY_COOKIE)?.value === "1";
}

export async function clearRecoveryGrant(): Promise<void> {
  const store = await cookies();
  store.delete(RECOVERY_COOKIE);
}
