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
