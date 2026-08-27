import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { rateLimitTake } from "@/lib/db/admin";

/**
 * Rate limiting for the paths Supabase cannot see (issue #61).
 *
 * Supabase Auth limits sign-in, sign-up and OTP resend from its own settings
 * (#59). This module owns what is left: creating and accepting invitations.
 * The store is Postgres (`rate_limit_hit` + `rate_limit_take`) rather than a KV
 * service — the limit has to survive across serverless invocations, which rules
 * out in-process memory, but at MVP volume a new runtime dependency earns
 * nothing and costs due-diligence surface.
 */

export type RateLimitRule = {
  /** Prefix of the bucket key — also what a reader sees in the table. */
  readonly name: string;
  readonly limit: number;
  readonly windowSeconds: number;
};

/**
 * PROVISIONAL until #59 lands. That issue settles what Supabase's own auth
 * limits already cover; these two paths are outside them either way, so the
 * mechanism ships now and the numbers get revisited with the settings in front
 * of us. They are deliberately generous: a limiter that fires on ordinary use
 * teaches people to distrust the product.
 */

/** An Admin onboarding a team in one sitting sends maybe a dozen invites; a
 *  hundred an hour is someone using the sending domain as a mailer. */
export const INVITE_CREATE: RateLimitRule = {
  name: "invite:create",
  limit: 30,
  windowSeconds: 60 * 60,
};

/** Accepting is a once-per-lifetime act. Anything past a handful of attempts
 *  from one address is a probe or a retry storm, not a person. */
export const INVITE_ACCEPT: RateLimitRule = {
  name: "invite:accept",
  limit: 10,
  windowSeconds: 10 * 60,
};

/**
 * Hashes whatever identifies the caller before it is stored. The bucket keys an
 * IP address or a tenant; an IP is personal data under the LGPD, and this table
 * has no business becoming a record of who tried what. Truncated because a
 * bucket key needs to be unique, not reversible.
 */
export function hashSubject(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

/** The stored key. Kept pure so the shape is testable without a database. */
export function bucketKey(rule: RateLimitRule, subject: string): string {
  return `${rule.name}:${subject}`;
}

/**
 * Headers that identify the caller, most trustworthy FIRST.
 *
 * `x-forwarded-for` is a client-supplied header in the general case: anyone can
 * send one, and it is only trustworthy if the proxy in front **overwrites**
 * rather than appends. Keying the public accept endpoint on a value the caller
 * may control would make this limiter bypassable by rotating a single header —
 * and that limiter is the entire protection on that route. So the platform's
 * own headers are consulted first: they are stamped at the edge and a request
 * cannot forge them. `x-forwarded-for` stays last, a fallback rather than the
 * source of truth.
 */
const CLIENT_IP_HEADERS = [
  "x-vercel-forwarded-for",
  "x-real-ip",
  "x-forwarded-for",
] as const;

/** Pure so the precedence itself is testable — that order is the security
 *  property, not an implementation detail. */
export function clientIpFrom(header: (name: string) => string | null): string {
  for (const name of CLIENT_IP_HEADERS) {
    // A list means proxies appended; the leftmost entry is the original peer.
    const value = header(name)?.split(",")[0]?.trim();
    if (value) return value;
  }
  // Behind no proxy at all (local dev) there is nothing to key on and every
  // caller shares one bucket — which throttles harder, not softer, so it fails
  // in the safe direction.
  return "unknown";
}

/** Best-effort identity for an unauthenticated caller. */
export async function clientFingerprint(): Promise<string> {
  const h = await headers();
  return hashSubject(clientIpFrom((name) => h.get(name)));
}

/**
 * Takes one slot. `true` means proceed.
 *
 * **Fails open.** If the RPC is unreachable — or the migration has not been
 * applied yet — invitations keep working rather than the product locking its
 * own customers out over a limiter. The trade is deliberate: this guards a spam
 * vector and a cheap-probe surface, not a secret. Nothing about the subject is
 * logged on either path.
 */
export async function takeRateLimitSlot(
  rule: RateLimitRule,
  subject: string,
): Promise<boolean> {
  try {
    return await rateLimitTake({
      p_bucket: bucketKey(rule, subject),
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
  } catch {
    return true;
  }
}

/** One calm answer, in pt-BR, that discloses nothing about accounts or tokens —
 *  only that the caller should wait. */
export const RATE_LIMITED_MESSAGE =
  "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
