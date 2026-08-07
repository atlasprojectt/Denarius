// What a log line is allowed to carry (issue #79). Pure — no I/O, no env — so
// the rule is exhaustively testable, which is the point: §14 is absolute and
// very easy to break while adding logs in a hurry.
//
// It builds on the audit trail's redaction (lib/audit/redact.ts) rather than
// restating it: one rule about what a secret looks like, two consumers. Then it
// adds a pass the audit trail must NOT have. The audit trail names its actor on
// purpose — a departure must not blank the history of what that person did. A
// log line has no such need, and the product's whole promise is that it holds
// usage metadata and never a leaderboard. So here, people disappear.

import { REDACTED, redactDetail, type AuditDetail, type AuditDetailValue } from "@/lib/audit/redact";

export type { AuditDetail as LogDetail, AuditDetailValue as LogValue };
export { REDACTED };

/** Keys that name a person, or carry what a person wrote. Prompts and responses
 *  are never stored anywhere in this product; a log line is not the exception. */
const PERSONAL_KEY =
  /(e-?mail|user_?id|userid|person|employee|actor|display_?name|nome|prompt|response|completion|content|body)/i;

/** An address anywhere inside a value — a Postgres unique-violation message
 *  carries the offending value, which for `app_user` or `employee` is exactly
 *  an e-mail address. */
const EMAIL = /[^\s@]+@[^\s@.]+\.[^\s@]+/g;

/** A credential EMBEDDED in free text. The audit rule tests whole values, which
 *  is right for a detail field someone chose to record; a provider's error
 *  message is not chosen, and "Incorrect API key provided: sk-…" would sail
 *  through it. */
const EMBEDDED_SECRET = /\b(?:sk|pk|rk)[-_][A-Za-z0-9_-]{8,}|\beyJ[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9._-]+)*/g;

/** A bare key can be base64/hex with no recognisable prefix. Preserve UUIDs,
 *  which are legitimate tenant and row references, and mask every other long
 *  unbroken token-alphabet run. */
const EMBEDDED_OPAQUE = /\b[A-Za-z0-9+/=_-]{32,}\b/g;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Strips the two things free text hides: people and credentials. */
function maskText(value: string): string {
  return value
    .replace(EMAIL, REDACTED)
    .replace(EMBEDDED_SECRET, REDACTED)
    .replace(EMBEDDED_OPAQUE, (candidate) =>
      UUID.test(candidate) ? candidate : REDACTED,
    );
}

function scrub(value: AuditDetailValue): AuditDetailValue {
  if (typeof value === "string") return maskText(value);
  if (Array.isArray(value)) return value.map(scrub);
  if (value !== null && typeof value === "object") return scrubDetail(value);
  return value;
}

function scrubDetail(detail: Record<string, AuditDetailValue>): AuditDetail {
  const safe: AuditDetail = {};
  for (const [key, value] of Object.entries(detail)) {
    safe[key] = PERSONAL_KEY.test(key) ? REDACTED : scrub(value);
  }
  return safe;
}

/**
 * The one chokepoint between an operation and its log line: the audit rule for
 * secrets, then the personal-data pass above.
 */
export function redactLogDetail(detail: AuditDetail): AuditDetail {
  return scrubDetail(redactDetail(detail));
}

/**
 * What is safe to record about a thrown value. The class name and a redacted
 * message — never the stack, which is where framework internals and, on a
 * database driver, the offending row's values tend to live.
 */
export function describeError(error: unknown): AuditDetail {
  if (error instanceof Error) {
    return { kind: error.name, reason: maskText(error.message) };
  }
  return { kind: typeof error };
}
