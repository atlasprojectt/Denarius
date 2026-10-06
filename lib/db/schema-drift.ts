/** PostgreSQL's code for a column a read names that this schema lacks. */
const UNDEFINED_COLUMN = "42703";
/** PostgREST's code for a column a write names that its schema cache lacks —
 *  writes are rejected before they reach Postgres, so 42703 never appears. */
const COLUMN_NOT_IN_SCHEMA_CACHE = "PGRST204";

/** True when a query named a column the live database does not have yet —
 *  a migration still waiting on the approved deployment path. Callers fall
 *  back to the pre-migration behavior instead of failing the request. */
export function isUndefinedColumn(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const code = Reflect.get(error, "code");
  return code === UNDEFINED_COLUMN || code === COLUMN_NOT_IN_SCHEMA_CACHE;
}
