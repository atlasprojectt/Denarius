import { createClient } from "@supabase/supabase-js";
import { describe, it } from "vitest";

/**
 * The gate every database-backed suite passes through (issue #78).
 *
 * These suites — RLS isolation above all — were written to self-skip when the
 * Supabase env is absent, which is exactly what happened in CI: the workflow
 * gave the job no database, so the single most important test in the repo
 * never ran and the green check said otherwise. A test that silently does not
 * run is worse than a missing one.
 *
 * So the skip is now conditional on WHO is asking:
 *   - locally, without `.env.local`, it stays a quiet skip (the pure engine
 *     suites must remain runnable with no infrastructure at all);
 *   - in CI, `DENARIUS_REQUIRE_DB_TESTS=1` turns the same skip into a FAILING
 *     test, so a missing database or an unapplied migration is red, not green.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasDbEnv = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseServiceKey,
);

/** True when a skipped database suite must fail the build (set in CI). */
export function databaseRequired(): boolean {
  return process.env.DENARIUS_REQUIRE_DB_TESTS === "1";
}

/** Service-role client for readiness probes and fixtures. */
export function adminClient() {
  return createClient(supabaseUrl ?? "http://skip", supabaseServiceKey ?? "skip", {
    auth: { persistSession: false },
  });
}

/** Whether a table/column exists and is reachable — the readiness probe. */
export async function tableApplied(
  table: string,
  columns = "id",
): Promise<boolean> {
  if (!hasDbEnv) return false;
  const { error } = await adminClient().from(table).select(columns).limit(1);
  if (error && databaseRequired()) {
    // Codes are enough to distinguish a missing relation/schema-cache entry
    // from a privilege failure, without copying a row value into CI output.
    console.warn(`[database readiness] ${table} failed (${error.code})`);
  }
  return !error;
}

function report(label: string, reason: string): void {
  const message = `[${label}] did not run — ${reason}`;
  if (!databaseRequired()) {
    console.warn(`\n${message}\n`);
    return;
  }
  // Registered at collection time, so it is a real failing test in the report
  // rather than an exception nobody attributes to anything.
  describe(`${label} (database required)`, () => {
    it("runs against a database", () => {
      throw new Error(
        `${message}\nDENARIUS_REQUIRE_DB_TESTS=1 is set: a database-backed ` +
          `suite that skips is a build failure, not a pass.`,
      );
    });
  });
}

/**
 * Gates a whole suite. Pass the readiness probe's result; the return value is
 * what `describe.skipIf(!ready)` should read.
 */
export function requireDatabaseSuite(
  label: string,
  ready: boolean,
  reason: string,
): boolean {
  if (!ready) report(label, reason);
  return ready;
}

/**
 * Gates one table inside a suite that already has a database — an unapplied
 * migration leaves that table's isolation unverified, which in CI is the same
 * failure as having no database at all.
 */
export function requireTable(
  label: string,
  table: string,
  applied: boolean,
  migration: string,
): boolean {
  if (!applied) {
    report(`${label}: ${table}`, `apply supabase/migrations/${migration}`);
  }
  return applied;
}
