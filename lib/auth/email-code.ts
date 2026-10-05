import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Six-digit codes e-mailed to prove the person still controls the account's
 * address — used by account deletion and by password change. A code is never
 * stored or logged in the clear: callers keep only its HMAC, and `namespace`
 * domain-separates the flows so a value minted for one can never verify in
 * another.
 */

function codeSecret(): string {
  // Named after its first consumer; renaming it would orphan the secret that
  // is already configured in every environment.
  const secret =
    process.env.ACCOUNT_DELETION_HMAC_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("E-mail code verification is not configured.");
  }
  return secret;
}

export function generateEmailCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function emailCodeHmac(namespace: string, value: string): string {
  return createHmac("sha256", codeSecret())
    .update(`${namespace}:${value}`)
    .digest("hex");
}

export function sameHmac(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}
