/**
 * The six-digit e-mail codes Denarius mints itself (password change, account
 * deletion). Pure and client-safe on purpose: the server modules enforce these
 * values while the code screens and the e-mails state them, so the expiry a
 * person is promised cannot drift from the one that is enforced.
 */
export const EMAIL_CODE_TTL_MINUTES = 10;

/** Wait before another code may be requested from a code screen. */
export const EMAIL_CODE_RESEND_COOLDOWN_SECONDS = 60;
