import { z } from "zod";

// Denarius — THE password rule of the product (issue #58). Signup, invitation
// acceptance, recovery (#68) and change-password (#69) all consume what is in
// this file, so there is exactly one place to change the rule.
//
// The rule is LENGTH + BREACH, deliberately with NO composition requirement.
// "One uppercase, one digit, one symbol" is what produces `Senha@123` and
// password reuse: it costs usability and buys nothing that length plus a
// breach check does not buy better. This is current NIST 800-63B guidance and
// a decision for this product — not an oversight. Do not add character classes
// here.
//
// The breach half is enforced by Supabase's leaked-password protection
// (HaveIBeenPwned), a project setting rather than app code — checking it a
// second time from here would duplicate the rule. It reaches the user through
// `weakPasswordError()` below, which turns Supabase's refusal into a pt-BR
// field error.

export const PASSWORD_MIN = 10;

/**
 * bcrypt — what Supabase Auth hashes with — silently truncates at 72 BYTES:
 * anything past that is not part of the secret. Refusing the input is honest;
 * accepting it would sell a strength the hash does not have.
 */
export const PASSWORD_MAX_BYTES = 72;

const TOO_SHORT = `A senha precisa de pelo menos ${PASSWORD_MIN} caracteres.`;
const TOO_LONG = "Senha longa demais. Encurte para no máximo 72 caracteres.";
const MISMATCH = "As senhas não conferem.";

export const WEAK_PASSWORD_MESSAGE =
  "Esta senha é fraca demais. Escolha outra, mais longa e única.";
export const LEAKED_PASSWORD_MESSAGE =
  "Esta senha aparece em vazamentos públicos conhecidos. Escolha outra, que você não use em nenhum outro lugar.";

/** Never trimmed: spaces are legitimate characters inside a password, and
 *  trimming would silently change the secret the person typed. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, TOO_SHORT)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
    message: TOO_LONG,
  });

/**
 * A password field plus its confirmation, with any extra fields the screen
 * needs (the change-password form adds `currentPassword`). The mismatch lands
 * on the confirmation input, which is the one the person should fix.
 */
const confirmedPassword = z
  .object({ password: passwordSchema, confirmation: z.string() })
  .refine((data) => data.password === data.confirmation, {
    message: MISMATCH,
    path: ["confirmation"],
  });

export function withConfirmation<T extends z.ZodRawShape>(shape: T) {
  // Intersection rather than one big object: the match rule stays written once,
  // on concrete fields, instead of being re-derived for each caller's shape.
  return z.object(shape).and(confirmedPassword);
}

export type PasswordFieldError = {
  error: string;
  fieldErrors: { password: string };
};

/** The shape of an auth user this module needs — narrowed so callers do not
 *  depend on the SDK's `User` type just to ask this one question. */
type IdentifiedUser = {
  identities?: { provider: string }[] | null;
  app_metadata?: { providers?: string[] | null } | null;
} | null | undefined;

/**
 * Does this account have a password at all? (issue #69)
 *
 * Someone who signed up through Google has no password identity, so a
 * change-password form would be asking for a secret that does not exist —
 * `signInWithPassword` would fail with "invalid credentials" and read as "you
 * typed it wrong". The screen explains instead, and the action refuses on the
 * same answer rather than trusting the UI to have hidden the form.
 *
 * `identities` is the authoritative list; `app_metadata.providers` is the
 * fallback for a session shape that omits it. Absent both, we assume a password
 * exists — hiding the form from someone who has one would lock them out of
 * changing it, which is the worse failure.
 */
export function hasPasswordIdentity(user: IdentifiedUser): boolean {
  const identities = user?.identities;
  if (identities && identities.length > 0) {
    return identities.some((identity) => identity.provider === "email");
  }
  const providers = user?.app_metadata?.providers;
  if (providers && providers.length > 0) return providers.includes("email");
  return true;
}

/** Shape of the error Supabase returns when it refuses a password — narrowed
 *  here so callers do not depend on the SDK's error classes. */
type WeakPasswordErrorish = {
  code?: string | null;
  reasons?: string[] | null;
} | null | undefined;

/**
 * Maps Supabase's `weak_password` refusal onto a pt-BR field error on the
 * password input. Returns null for every other error, so a caller reads:
 * `return weakPasswordError(error) ?? { error: "…generic…" }`.
 */
export function weakPasswordError(error: WeakPasswordErrorish): PasswordFieldError | null {
  if (!error || error.code !== "weak_password") return null;
  // `reasons` distinguishes the breach list from plain weakness; when the SDK
  // omits it, the calmer generic message is the safe fallback.
  const message = error.reasons?.includes("pwned")
    ? LEAKED_PASSWORD_MESSAGE
    : WEAK_PASSWORD_MESSAGE;
  return { error: message, fieldErrors: { password: message } };
}
