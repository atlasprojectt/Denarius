// The one chokepoint between an administrative action and the audit trail
// (issue #73). Pure — no I/O, no env, so it is exhaustively testable.
//
// The rule the log must never break: record THAT the OpenAI key was rotated,
// never the key. Call sites are written to pass only the auditable substance,
// but "everybody remembers" is not a control — a value that looks like a
// credential is dropped here regardless of who passed it.

export type AuditDetailValue =
  | string
  | number
  | boolean
  | null
  | AuditDetailValue[]
  | { [key: string]: AuditDetailValue };

export type AuditDetail = Record<string, AuditDetailValue>;

/** What replaces a value that looked like a secret. Not UI copy — this is data,
 *  and it exists so the entry says "something was here" rather than lying by
 *  omission. */
export const REDACTED = "[redacted]";

/** Key names that carry a secret by definition, in the two languages the code
 *  base mixes (identifiers are English; a form field can arrive in pt-BR). */
const SENSITIVE_KEY =
  /(password|senha|secret|token|credential|credencial|chave|key|hash|authorization|cookie)/i;

/** A uuid is a legitimate detail value (team ids, row ids) and must survive the
 *  opaque-string rule below, which it would otherwise trip on length alone. */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Provider key shapes and bearer tokens, whatever their length. `eyJ` is a
 *  JWT header — narrow on purpose, so an ordinary word starting with "ey" is
 *  not mistaken for one. */
const KEY_PREFIX = /^(sk-|sk_|pk_|rk_|eyJ[A-Za-z0-9_-]{10,}|bearer\s)/i;

/** A long unbroken run of token alphabet: base64, hex, or a random id. Nothing
 *  the call sites legitimately record looks like this. */
const OPAQUE = /^[A-Za-z0-9+/=_-]{32,}$/;

function looksSecret(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return false;
  if (KEY_PREFIX.test(trimmed)) return true;
  if (UUID.test(trimmed)) return false;
  return OPAQUE.test(trimmed);
}

/** Redacts one value, recursing into arrays and objects. */
export function redactValue(value: AuditDetailValue): AuditDetailValue {
  if (typeof value === "string") return looksSecret(value) ? REDACTED : value;
  if (Array.isArray(value)) return value.map(redactValue);
  if (value !== null && typeof value === "object") return redactDetail(value);
  return value;
}

/** Redacts a detail object: a sensitive KEY drops its value whatever it holds,
 *  and every remaining value is checked on its own shape. */
export function redactDetail(detail: Record<string, AuditDetailValue>): AuditDetail {
  const safe: AuditDetail = {};
  for (const [key, value] of Object.entries(detail)) {
    safe[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactValue(value);
  }
  return safe;
}

/** The target label goes through the same shape check: it is written by the
 *  same call sites and displayed in the same list. */
export function redactTarget(target: string | null | undefined): string | null {
  if (target === null || target === undefined) return null;
  return looksSecret(target) ? REDACTED : target;
}
