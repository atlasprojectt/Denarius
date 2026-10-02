/** PostgREST's PostgreSQL code for a column that has not reached this schema. */
const UNDEFINED_COLUMN = "42703";

export function isMissingProfileAvatarColumn(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const code = Reflect.get(error, "code");
  return code === UNDEFINED_COLUMN;
}
