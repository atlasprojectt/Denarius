import "server-only";

import { Pool } from "@neondatabase/serverless";

import { logFailure } from "@/lib/logging/server-log";

/**
 * Privileged database access (the service-role equivalent, stage 1 of the
 * Supabase → Neon migration). Connects DIRECTLY to Postgres as the dedicated
 * `denarius_backend` role — never `neondb_owner`, never the Data API — and
 * bypasses RLS through that role's own grants/policies, exactly the trust
 * `SUPABASE_SERVICE_ROLE_KEY` carried before.
 *
 * Deliberately NOT a generic query-builder clone: every operation is a named,
 * auditable helper below, and callers never hand in SQL. Only these helpers may
 * touch this pool, so the privileged surface stays enumerable.
 *
 * The connection string lives exclusively in NEON_BACKEND_DATABASE_URL
 * (server-only env). It is never returned, logged or serialized here.
 */

/** Named after the Postgres function, so the log/SQL read the same thing. */
export type RateLimitTakeParams = {
  p_bucket: string;
  p_limit: number;
  p_window_seconds: number;
};

type RateLimitRow = { rate_limit_take?: boolean };

type AuditLogInsert = {
  tenant_id: string;
  actor_id: string;
  actor_email: string;
  action: string;
  target: string | null;
  detail: unknown;
};

// Cached on globalThis so Next.js dev hot reloads reuse one pool instead of
// leaking one per re-evaluated module graph.
const globalStore = globalThis as typeof globalThis & {
  __denariusBackendPool?: Pool;
};

/**
 * Fails LOUDLY when the env is missing: this module backs the audit trail and
 * the rate limiter, and silently falling back to an unconfigured state would
 * turn every later error into a mystery. Throwing at first use keeps local dev
 * (no Neon env) working for everything that does not touch these two paths.
 */
function backendPool(): Pool {
  const connectionString = process.env.NEON_BACKEND_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "NEON_BACKEND_DATABASE_URL is not set — privileged Neon access is unconfigured.",
    );
  }
  if (!globalStore.__denariusBackendPool) {
    globalStore.__denariusBackendPool = new Pool({ connectionString });
  }
  return globalStore.__denariusBackendPool;
}

/**
 * Calls public.rate_limit_take(text, integer, integer) — the SECURITY DEFINER
 * function itself, unchanged. Fully parameterized. Throws on database failure;
 * the caller (lib/auth/rate-limit.ts) owns the fail-open policy.
 */
export async function rateLimitTake({
  p_bucket,
  p_limit,
  p_window_seconds,
}: RateLimitTakeParams): Promise<boolean> {
  const result = await backendPool().query<RateLimitRow>(
    "select public.rate_limit_take($1, $2, $3) as rate_limit_take",
    [p_bucket, p_limit, p_window_seconds],
  );
  // Same convention as the previous RPC path: anything other than an explicit
  // `false` proceeds (null/undefined included).
  return result.rows[0]?.rate_limit_take !== false;
}

/**
 * Inserts audit rows in ONE round trip, fully parameterized — same columns,
 * same defaults (created_at left to the database), same batch semantics the
 * Supabase `.insert(rows)` call had. Throws on failure; the caller decides
 * what a failed audit entry means.
 */
export async function insertAuditLog(rows: AuditLogInsert[]): Promise<void> {
  if (rows.length === 0) return;

  const columns = [
    "tenant_id",
    "actor_id",
    "actor_email",
    "action",
    "target",
    "detail",
  ] as const;
  const values: unknown[] = [];
  const tuples = rows.map((r) => {
    const tuple = columns.map((c) => {
      values.push(r[c]);
      return `$${values.length}`;
    });
    return `(${tuple.join(", ")})`;
  });

  await backendPool().query(
    `insert into public.audit_log (${columns.join(", ")}) values ${tuples.join(", ")}`,
    values,
  );
}

// ---------------------------------------------------------------------------
// Provider sync (stage 2). Named after the domain operation, one helper per
// access pattern lib/sync/provider-sync.ts and the cron route perform. All
// parameterized; none accept caller-supplied SQL.
// ---------------------------------------------------------------------------

export type ProviderConnectionForSync = {
  id: string;
  encrypted_credential: string | null;
  status: string;
};

/** The connection row a sync runs against, or null when there is none. */
export async function findProviderConnectionForSync(
  tenantId: string,
  provider: string,
): Promise<ProviderConnectionForSync | null> {
  const result = await backendPool().query<ProviderConnectionForSync>(
    "select id, encrypted_credential, status from public.provider_connection where tenant_id = $1 and provider = $2 limit 1",
    [tenantId, provider],
  );
  return result.rows[0] ?? null;
}

/** The tenant's person-grain consent, or null when the row is missing — the
 *  caller defaults missing to true (data minimization), so null is distinct. */
export async function findTenantStorePerPerson(
  tenantId: string,
): Promise<boolean | null> {
  const result = await backendPool().query<{ store_per_person: boolean }>(
    "select store_per_person from public.tenant where id = $1 limit 1",
    [tenantId],
  );
  return result.rows[0]?.store_per_person ?? null;
}

export type SyncModelPrice = {
  provider: string;
  model: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
  effectiveDate: string;
};

/**
 * Every price row. Unlike PostgREST (JSON numbers), the wire protocol returns
 * NUMERIC as a string — converted here so callers keep receiving numbers.
 */
export async function listModelPrices(): Promise<SyncModelPrice[]> {
  const result = await backendPool().query<{
    provider: string;
    model: string;
    input_price_per_1m: string | number;
    output_price_per_1m: string | number;
    effective_date: string;
  }>(
    "select provider, model, input_price_per_1m, output_price_per_1m, effective_date from public.model_price",
  );
  return result.rows.map((p) => ({
    provider: p.provider,
    model: p.model,
    inputPricePer1M: Number(p.input_price_per_1m),
    outputPricePer1M: Number(p.output_price_per_1m),
    effectiveDate: p.effective_date,
  }));
}

/** Replaces the current month-to-date slice for one tenant/provider before
 *  its re-insert — the stale-person-grain guard (#23). */
export async function deleteUsageDailyFrom(
  tenantId: string,
  provider: string,
  fromDate: string,
): Promise<void> {
  await backendPool().query(
    "delete from public.usage_daily where tenant_id = $1 and provider = $2 and date >= $3",
    [tenantId, provider, fromDate],
  );
}

export type UsageDailyUpsert = {
  tenant_id: string;
  date: string;
  provider: string;
  project_id: string | null;
  api_key_id: string | null;
  user_id: string | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  /** null when the model has no price row — stored as SQL NULL, never 0. */
  derived_cost: number | null;
  uncosted: boolean;
  synced_at: string;
};

/**
 * Batch upsert on the natural key (tenant_id,date,provider,project_id,
 * api_key_id,user_id,model) — the exact conflict target the PostgREST upsert
 * declared. Only the measured/derived columns are overwritten; key columns are
 * equal by definition. Empty batch = no query (same guard the caller had).
 * Chunked at 500 rows to stay far below the 65535 bind-parameter ceiling.
 */
export async function upsertUsageDaily(rows: UsageDailyUpsert[]): Promise<void> {
  const columns = [
    "tenant_id",
    "date",
    "provider",
    "project_id",
    "api_key_id",
    "user_id",
    "model",
    "input_tokens",
    "output_tokens",
    "derived_cost",
    "uncosted",
    "synced_at",
  ] as const;
  const conflictUpdate =
    " on conflict (tenant_id, date, provider, project_id, api_key_id, user_id, model)" +
    " do update set input_tokens = excluded.input_tokens," +
    " output_tokens = excluded.output_tokens," +
    " derived_cost = excluded.derived_cost," +
    " uncosted = excluded.uncosted," +
    " synced_at = excluded.synced_at";

  const CHUNK = 500;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunk = rows.slice(start, start + CHUNK);
    const values: unknown[] = [];
    const tuples = chunk.map((row) =>
      `(${columns
        .map((c) => {
          values.push(row[c]);
          return `$${values.length}`;
        })
        .join(", ")})`,
    );
    await backendPool().query(
      `insert into public.usage_daily (${columns.join(", ")}) values ${tuples.join(", ")}${conflictUpdate}`,
      values,
    );
  }
}

export type CostDailyUpsert = {
  tenant_id: string;
  date: string;
  provider: string;
  project_id: string | null;
  line_item: string;
  amount: number;
  currency: string;
  synced_at: string;
};

/** Batch upsert on (tenant_id,date,provider,project_id,line_item); amount,
 *  currency and synced_at are what a re-sync overwrites. */
export async function upsertCostDaily(rows: CostDailyUpsert[]): Promise<void> {
  const columns = [
    "tenant_id",
    "date",
    "provider",
    "project_id",
    "line_item",
    "amount",
    "currency",
    "synced_at",
  ] as const;
  const conflictUpdate =
    " on conflict (tenant_id, date, provider, project_id, line_item)" +
    " do update set amount = excluded.amount," +
    " currency = excluded.currency," +
    " synced_at = excluded.synced_at";

  const CHUNK = 500;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunk = rows.slice(start, start + CHUNK);
    const values: unknown[] = [];
    const tuples = chunk.map((row) =>
      `(${columns
        .map((c) => {
          values.push(row[c]);
          return `$${values.length}`;
        })
        .join(", ")})`,
    );
    await backendPool().query(
      `insert into public.cost_daily (${columns.join(", ")}) values ${tuples.join(", ")}${conflictUpdate}`,
      values,
    );
  }
}

/** The failure stamp: leaves last_sync_at untouched, exactly as the error-path
 *  update always did — the banner must keep showing the LAST good sync. */
export async function markProviderConnectionSyncError(
  id: string,
  message: string,
  updatedAt: string,
): Promise<void> {
  await backendPool().query(
    "update public.provider_connection set status = 'error', last_sync_error = $2, updated_at = $3 where id = $1",
    [id, message, updatedAt],
  );
}

/** The success stamp: one timestamp for the whole run, error cleared. */
export async function activateProviderConnectionSync(
  id: string,
  syncedAt: string,
): Promise<void> {
  await backendPool().query(
    "update public.provider_connection set status = 'active', last_sync_at = $2, last_sync_error = null, updated_at = $2 where id = $1",
    [id, syncedAt],
  );
}

// ---------------------------------------------------------------------------
// Provider key lifecycle (stage 3) — lib/providers/actions.ts. The credential
// itself is ALWAYS a bind parameter; it never enters the SQL text.
// ---------------------------------------------------------------------------

/** The current status of a tenant's (tenant, provider) connection row, or null
 *  when there is none — save-vs-rotate is decided by existence, never by
 *  reading the ciphertext (#73). */
export async function findProviderConnectionStatus(
  tenantId: string,
  provider: string,
): Promise<string | null> {
  const result = await backendPool().query<{ status: string }>(
    "select status from public.provider_connection where tenant_id = $1 and provider = $2 limit 1",
    [tenantId, provider],
  );
  return result.rows[0]?.status ?? null;
}

/**
 * Save-or-rotate: one statement on the (tenant_id, provider) natural key. A
 * fresh insert takes the database defaults for created_at/last_sync_at; the
 * conflict branch overwrites ONLY credential, status and the error/updated
 * stamps — last_sync_at survives a rotation, which the old PostgREST payload
 * expressed by omission.
 */
export async function upsertProviderConnectionCredential(
  row: { tenant_id: string; provider: string; encrypted_credential: string },
  updatedAt: string,
): Promise<void> {
  await backendPool().query(
    "insert into public.provider_connection" +
      " (tenant_id, provider, encrypted_credential, status, last_sync_error, updated_at)" +
      " values ($1, $2, $3, 'active', null, $4)" +
      " on conflict (tenant_id, provider) do update set" +
      " encrypted_credential = excluded.encrypted_credential," +
      " status = 'active'," +
      " last_sync_error = null," +
      " updated_at = excluded.updated_at",
    [row.tenant_id, row.provider, row.encrypted_credential, updatedAt],
  );
}

/**
 * Discards the ciphertext and marks the connection revoked. Returns how many
 * rows changed — 0 means there was nothing to revoke (the caller turns that
 * into the calm pt-BR answer instead of an error).
 */
export async function revokeProviderConnection(
  tenantId: string,
  provider: string,
  updatedAt: string,
): Promise<number> {
  const result = await backendPool().query(
    "update public.provider_connection set status = 'revoked', encrypted_credential = null, updated_at = $3 where tenant_id = $1 and provider = $2",
    [tenantId, provider, updatedAt],
  );
  return result.rowCount ?? 0;
}

// ---------------------------------------------------------------------------
// Attribution + subscriptions (stage 4) — lib/attribution/actions.ts and
// lib/subscriptions/actions.ts.
// ---------------------------------------------------------------------------

/**
 * Write-guard mirroring lib/teams/queries.ts isOwnedTeam semantics exactly:
 * null = shared/company-wide and always valid; a DB error logs under the same
 * "team.ownership" op and reads as NOT owned (fail closed).
 */
export async function isOwnedTeam(
  tenantId: string,
  teamId: string | null,
): Promise<boolean> {
  if (teamId === null) return true;
  try {
    const result = await backendPool().query<{ is_unattributed: boolean }>(
      "select is_unattributed from public.team where id = $1 and tenant_id = $2 limit 1",
      [teamId, tenantId],
    );
    const team = result.rows[0];
    return team !== undefined && !team.is_unattributed;
  } catch (cause) {
    logFailure("team.ownership", tenantId, {
      code: ((cause as { code?: unknown } | null)?.code as string | undefined) ?? "unknown",
    });
    return false;
  }
}

/** The tenant's display currency, or null when the row is missing — callers
 *  apply their own fallback ("BRL" in subscriptions). */
export async function findTenantDisplayCurrency(
  tenantId: string,
): Promise<string | null> {
  const result = await backendPool().query<{ display_currency: string }>(
    "select display_currency from public.tenant where id = $1 limit 1",
    [tenantId],
  );
  return result.rows[0]?.display_currency ?? null;
}

export type ProjectMapUpsert = {
  tenant_id: string;
  provider: string;
  project_id: string;
  team_id: string;
  updated_at: string;
};

/**
 * Batch upsert on (tenant_id, provider, project_id); only team_id and the
 * updated stamp are overwritten — the key columns are equal by definition.
 * Empty batch = no query. ignoreDuplicates was never set on this path, so
 * conflicts DO update.
 */
export async function upsertProjectMap(rows: ProjectMapUpsert[]): Promise<void> {
  if (rows.length === 0) return;

  const columns = ["tenant_id", "provider", "project_id", "team_id", "updated_at"] as const;
  const conflictUpdate =
    " on conflict (tenant_id, provider, project_id)" +
    " do update set team_id = excluded.team_id," +
    " updated_at = excluded.updated_at";

  const CHUNK = 500;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunk = rows.slice(start, start + CHUNK);
    const values: unknown[] = [];
    const tuples = chunk.map((row) =>
      `(${columns
        .map((c) => {
          values.push(row[c]);
          return `$${values.length}`;
        })
        .join(", ")})`,
    );
    await backendPool().query(
      `insert into public.project_map (${columns.join(", ")}) values ${tuples.join(", ")}${conflictUpdate}`,
      values,
    );
  }
}

/** Clears one mapping — the row falls back to Unattributed by absence. */
export async function clearProjectMapping(
  tenantId: string,
  provider: string,
  projectId: string,
): Promise<void> {
  await backendPool().query(
    "delete from public.project_map where tenant_id = $1 and provider = $2 and project_id = $3",
    [tenantId, provider, projectId],
  );
}

export type SubscriptionInsert = {
  tenant_id: string;
  tool: string;
  seat_count: number;
  unit_price: number;
  currency: string;
  team_id: string | null;
};

export async function insertSubscription(row: SubscriptionInsert): Promise<void> {
  await backendPool().query(
    "insert into public.subscription (tenant_id, tool, seat_count, unit_price, currency, team_id) values ($1, $2, $3, $4, $5, $6)",
    [row.tenant_id, row.tool, row.seat_count, row.unit_price, row.currency, row.team_id],
  );
}

/** Tenant-scoped field update; returns matched rows so the caller keeps the
 *  count:"exact" contract (0 = foreign/stale id → reported failure). */
export async function updateSubscriptionById(
  id: string,
  tenantId: string,
  patch: {
    tool: string;
    seat_count: number;
    unit_price: number;
    team_id: string | null;
    updated_at: string;
  },
): Promise<number> {
  const result = await backendPool().query(
    "update public.subscription set tool = $3, seat_count = $4, unit_price = $5, team_id = $6, updated_at = $7 where id = $1 and tenant_id = $2",
    [id, tenantId, patch.tool, patch.seat_count, patch.unit_price, patch.team_id, patch.updated_at],
  );
  return result.rowCount ?? 0;
}

export type DeletedSubscription = {
  tool: string;
  seat_count: number;
  unit_price: number;
};

/**
 * Deletes with RETURNING — the audit entry needs the deleted tool without a
 * pre-read round trip (#73). Returns the affected-row count plus the first
 * returned row (NUMERIC arrives as a wire string; converted here).
 */
export async function deleteSubscriptionReturning(
  id: string,
  tenantId: string,
): Promise<{ count: number; row: DeletedSubscription | null }> {
  const result = await backendPool().query<{
    tool: string;
    seat_count: number;
    unit_price: string | number;
  }>(
    "delete from public.subscription where id = $1 and tenant_id = $2 returning tool, seat_count, unit_price",
    [id, tenantId],
  );
  const row = result.rows[0];
  return {
    count: result.rowCount ?? 0,
    row: row
      ? { tool: row.tool, seat_count: Number(row.seat_count), unit_price: Number(row.unit_price) }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Budgets (stage 5) — lib/budgets/actions.ts. Reuses findTenantDisplayCurrency
// and isOwnedTeam above: their semantics are exactly what this module needs.
// ---------------------------------------------------------------------------

/** The period's existing row for one scope (org = team_id IS NULL), or null.
 *  amount comes back as NUMERIC wire string and is converted here. */
export async function findBudgetForScope(
  tenantId: string,
  scope: string,
  teamId: string | null,
  periodMonth: string,
): Promise<{ id: string; amount: number } | null> {
  const result =
    teamId === null
      ? await backendPool().query<{
          id: string;
          amount: string | number;
        }>(
          "select id, amount from public.budget where tenant_id = $1 and scope = $2 and period_month = $3 and team_id is null limit 1",
          [tenantId, scope, periodMonth],
        )
      : await backendPool().query<{ id: string; amount: string | number }>(
          "select id, amount from public.budget where tenant_id = $1 and scope = $2 and period_month = $3 and team_id = $4 limit 1",
          [tenantId, scope, periodMonth, teamId],
        );
  const row = result.rows[0];
  return row ? { id: row.id, amount: Number(row.amount) } : null;
}

/** Tenant-scoped edit of the measured fields only; returns matched rows so the
 *  caller keeps the count:"exact" contract. Frozen FX columns untouched. */
export async function updateBudgetById(
  id: string,
  tenantId: string,
  patch: { amount: number; thresholds: number[]; updated_at: string },
): Promise<number> {
  const result = await backendPool().query(
    "update public.budget set amount = $3, thresholds = $4, updated_at = $5 where id = $1 and tenant_id = $2",
    [id, tenantId, patch.amount, patch.thresholds, patch.updated_at],
  );
  return result.rowCount ?? 0;
}

export type BudgetInsert = {
  tenant_id: string;
  scope: string;
  team_id: string | null;
  period_month: string;
  amount: number;
  currency: string;
  thresholds: number[];
  frozen_fx_rate: number | null;
  fx_rate_source: string | null;
  fx_rate_date: string | null;
};

const BUDGET_INSERT_COLUMNS = [
  "tenant_id",
  "scope",
  "team_id",
  "period_month",
  "amount",
  "currency",
  "thresholds",
  "frozen_fx_rate",
  "fx_rate_source",
  "fx_rate_date",
] as const;

function budgetInsertSql(): string {
  const columns = BUDGET_INSERT_COLUMNS;
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  return `insert into public.budget (${columns.join(", ")}) values (${placeholders})`;
}

export async function insertBudget(row: BudgetInsert): Promise<void> {
  const values = BUDGET_INSERT_COLUMNS.map((c) => row[c]);
  await backendPool().query(budgetInsertSql(), values);
}

/** Batch ownership check: which of these ids belong to this tenant AND are not
 *  the internal Unattributed bucket. Empty input = empty output, no query. */
export async function filterOwnedTeamIds(
  tenantId: string,
  teamIds: string[],
): Promise<string[]> {
  if (teamIds.length === 0) return [];
  const result = await backendPool().query<{ id: string }>(
    "select id from public.team where tenant_id = $1 and is_unattributed = false and id = any($2)",
    [tenantId, teamIds],
  );
  return result.rows.map((r) => r.id);
}

export type BudgetForPeriod = {
  id: string;
  scope: string;
  team_id: string | null;
  amount: number;
  /** numeric(4,3)[] arrives as wire strings; callers compare tolerantly. */
  thresholds: (number | string)[];
};

/** Every budget governing a tenant's period — the batch edit's baseline. */
export async function findBudgetsForPeriod(
  tenantId: string,
  periodMonth: string,
): Promise<BudgetForPeriod[]> {
  const result = await backendPool().query<{
    id: string;
    scope: string;
    team_id: string | null;
    amount: string | number;
    thresholds: (number | string)[] | null;
  }>(
    "select id, scope, team_id, amount, thresholds from public.budget where tenant_id = $1 and period_month = $2",
    [tenantId, periodMonth],
  );
  return result.rows.map((r) => ({
    id: r.id,
    scope: r.scope,
    team_id: r.team_id,
    amount: Number(r.amount),
    thresholds: r.thresholds ?? [],
  }));
}

export type DeletedBudget = {
  scope: string;
  team_id: string | null;
  amount: number;
};

/** Deletes with RETURNING — the audit entry names what was removed (#73).
 *  Idempotency rides on rowCount: 0 means nothing matched. */
export async function deleteBudgetReturning(
  id: string,
  tenantId: string,
): Promise<{ count: number; row: DeletedBudget | null }> {
  const result = await backendPool().query<{
    scope: string;
    team_id: string | null;
    amount: string | number;
  }>(
    "delete from public.budget where id = $1 and tenant_id = $2 returning scope, team_id, amount",
    [id, tenantId],
  );
  const row = result.rows[0];
  return {
    count: result.rowCount ?? 0,
    row: row ? { scope: row.scope, team_id: row.team_id, amount: Number(row.amount) } : null,
  };
}

// ---------------------------------------------------------------------------
// Snapshot close + alert dedup (stage 6) — lib/snapshot/close.ts and
// lib/notify/alerts.ts. Both writes are ignoreDuplicates upserts today, so
// both become ON CONFLICT ... DO NOTHING: a frozen month or a sent alert is
// never rewritten by a retried run.
// ---------------------------------------------------------------------------

export type PeriodSnapshotInsert = {
  tenant_id: string;
  period_month: string;
  closed_at: string;
  source: string;
  currency: string;
  api_usd: number;
  /** null when the seat configuration for a backfilled month is gone. */
  seats_amount: number | null;
  combined_amount: number | null;
  budget_amount: number | null;
  pct_spent: number | null;
  frozen_fx_rate: number | null;
  fx_rate_source: string | null;
  fx_rate_date: string | null;
  /** null when no budget governed the month — the verdict is then absent. */
  verdict_status: string | null;
  verdict_sentence: string | null;
  breakdown: unknown;
  has_uncosted: boolean;
  reconciliation_ok: boolean;
  fx_missing: boolean;
  stale_sync: boolean;
};

const PERIOD_SNAPSHOT_COLUMNS = [
  "tenant_id",
  "period_month",
  "closed_at",
  "source",
  "currency",
  "api_usd",
  "seats_amount",
  "combined_amount",
  "budget_amount",
  "pct_spent",
  "frozen_fx_rate",
  "fx_rate_source",
  "fx_rate_date",
  "verdict_status",
  "verdict_sentence",
  "breakdown",
  "has_uncosted",
  "reconciliation_ok",
  "fx_missing",
  "stale_sync",
] as const;

/**
 * Freezes one (tenant_id, period_month) — DO NOTHING under the table's own
 * unique key, so a second run of the day cannot overwrite a frozen month.
 */
export async function insertPeriodSnapshotIfAbsent(
  row: PeriodSnapshotInsert,
): Promise<void> {
  const placeholders = PERIOD_SNAPSHOT_COLUMNS.map((_, i) => `$${i + 1}`).join(", ");
  const values = PERIOD_SNAPSHOT_COLUMNS.map((c) => row[c]);
  await backendPool().query(
    `insert into public.period_snapshot (${PERIOD_SNAPSHOT_COLUMNS.join(", ")}) values (${placeholders})` +
      " on conflict (tenant_id, period_month) do nothing",
    values,
  );
}

/** The alert levels already recorded this period — the once-per-(target,
 *  level, period) dedup state. channel is fixed to email here because that is
 *  the only delivery channel the product has. */
export async function findNotificationLogLevels(
  tenantId: string,
  periodMonth: string,
): Promise<{ target_id: string; level: string }[]> {
  const result = await backendPool().query<{ target_id: string; level: string }>(
    "select target_id, level from public.notification_log where tenant_id = $1 and channel = 'email' and period_month = $2",
    [tenantId, periodMonth],
  );
  return result.rows;
}

export type NotificationLogInsert = {
  tenant_id: string;
  /** Only "email" exists today; kept a parameter to mirror the old payload. */
  channel: string;
  target_id: string;
  level: string;
  period_month: string;
};

/** Records crossed levels; duplicates (a retried run) insert nothing under
 *  the unique key. Empty batch = no query. */
export async function insertNotificationLogIfAbsent(
  rows: NotificationLogInsert[],
): Promise<void> {
  if (rows.length === 0) return;

  const columns = ["tenant_id", "channel", "target_id", "level", "period_month"] as const;
  const values: unknown[] = [];
  const tuples = rows.map((row) =>
    `(${columns
      .map((c) => {
        values.push(row[c]);
        return `$${values.length}`;
      })
      .join(", ")})`,
  );
  await backendPool().query(
    `insert into public.notification_log (${columns.join(", ")}) values ${tuples.join(", ")}` +
      " on conflict (tenant_id, channel, target_id, level, period_month) do nothing",
    values,
  );
}

// ---------------------------------------------------------------------------
// Digest cron + notification snapshot (stage 7) — app/api/cron/digest/route.ts
// and lib/notify/snapshot.ts. All per-tenant reads mirror the columns and
// filters the PostgREST path used; NUMERIC columns arrive as wire strings and
// are converted here where callers expect numbers.
// ---------------------------------------------------------------------------

/** Tenants with an org budget this period — the digest audience. Duplicates
 *  are possible (one row per matching budget); the caller dedups via Set. */
export async function listDigestTenantIds(periodMonth: string): Promise<string[]> {
  const result = await backendPool().query<{ tenant_id: string }>(
    "select tenant_id from public.budget where scope = 'org' and period_month = $1",
    [periodMonth],
  );
  return result.rows.map((r) => r.tenant_id);
}

export type NotificationBudgetRow = {
  scope: "org" | "team";
  team_id: string | null;
  amount: number;
  thresholds: number[] | null;
  frozen_fx_rate: number | null;
  fx_rate_source: string | null;
  fx_rate_date: string | null;
};

function numberArray(values: unknown[] | null): number[] | null {
  return values === null ? null : values.map((v) => Number(v));
}

export async function findNotificationBudgets(
  tenantId: string,
  periodMonth: string,
): Promise<NotificationBudgetRow[]> {
  const result = await backendPool().query<{
    scope: string;
    team_id: string | null;
    amount: string | number;
    thresholds: unknown[] | null;
    frozen_fx_rate: string | number | null;
    fx_rate_source: string | null;
    fx_rate_date: string | null;
  }>(
    "select scope, team_id, amount, thresholds, frozen_fx_rate, fx_rate_source, fx_rate_date from public.budget where tenant_id = $1 and period_month = $2",
    [tenantId, periodMonth],
  );
  return result.rows.map((b) => ({
    scope: b.scope as "org" | "team",
    team_id: b.team_id,
    amount: Number(b.amount),
    thresholds: numberArray(b.thresholds),
    frozen_fx_rate: b.frozen_fx_rate === null ? null : Number(b.frozen_fx_rate),
    fx_rate_source: b.fx_rate_source,
    fx_rate_date: b.fx_rate_date,
  }));
}

export type NotificationSubscriptionRow = {
  tool: string;
  seat_count: number;
  unit_price: number;
  team_id: string | null;
};

export async function findNotificationSubscriptions(
  tenantId: string,
): Promise<NotificationSubscriptionRow[]> {
  const result = await backendPool().query<{
    tool: string;
    seat_count: number;
    unit_price: string | number;
    team_id: string | null;
  }>(
    "select tool, seat_count, unit_price, team_id from public.subscription where tenant_id = $1",
    [tenantId],
  );
  return result.rows.map((s) => ({
    tool: s.tool,
    seat_count: Number(s.seat_count),
    unit_price: Number(s.unit_price),
    team_id: s.team_id,
  }));
}

export async function findNotificationTeams(
  tenantId: string,
): Promise<{ id: string; name: string }[]> {
  const result = await backendPool().query<{ id: string; name: string }>(
    "select id, name from public.team where tenant_id = $1 and is_unattributed = false",
    [tenantId],
  );
  return result.rows;
}

export type NotificationUsageRow = {
  provider: string;
  project_id: string;
  derived_cost: number | null;
  uncosted: boolean;
};

export async function findNotificationUsage(
  tenantId: string,
  fromDate: string,
): Promise<NotificationUsageRow[]> {
  const result = await backendPool().query<{
    provider: string;
    project_id: string;
    derived_cost: string | number | null;
    uncosted: boolean;
  }>(
    "select provider, project_id, derived_cost, uncosted from public.usage_daily where tenant_id = $1 and date >= $2",
    [tenantId, fromDate],
  );
  return result.rows.map((u) => ({
    provider: u.provider,
    project_id: u.project_id,
    derived_cost: u.derived_cost === null ? null : Number(u.derived_cost),
    uncosted: u.uncosted,
  }));
}

export async function findNotificationProjectMap(
  tenantId: string,
): Promise<{ provider: string; project_id: string; team_id: string }[]> {
  const result = await backendPool().query<{
    provider: string;
    project_id: string;
    team_id: string;
  }>(
    "select provider, project_id, team_id from public.project_map where tenant_id = $1",
    [tenantId],
  );
  return result.rows;
}

export type NotificationCostRow = {
  date: string;
  provider: string;
  amount: number;
};

export async function findNotificationRecentCosts(
  tenantId: string,
  fromDate: string,
): Promise<NotificationCostRow[]> {
  const result = await backendPool().query<{
    date: string;
    provider: string;
    amount: string | number;
  }>(
    "select date, provider, amount from public.cost_daily where tenant_id = $1 and date >= $2",
    [tenantId, fromDate],
  );
  return result.rows.map((c) => ({
    date: c.date,
    provider: c.provider,
    amount: Number(c.amount),
  }));
}

export async function findNotifiableUsers(
  tenantId: string,
): Promise<{ email: string; role: string; digest_opt_out: boolean }[]> {
  const result = await backendPool().query<{
    email: string;
    role: string;
    digest_opt_out: boolean;
  }>(
    "select email, role, digest_opt_out from public.app_user where tenant_id = $1",
    [tenantId],
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Closed-month snapshot reads (stage 8, final DB-pure module) —
// lib/snapshot/queries.ts. Bounded on BOTH ends (.gte start, .lt nextStart):
// unlike the live reads, a past month must not pick up future rows.
// ---------------------------------------------------------------------------

export async function findSnapshotTeamsOrdered(
  tenantId: string,
): Promise<{ id: string; name: string }[]> {
  const result = await backendPool().query<{ id: string; name: string }>(
    "select id, name from public.team where tenant_id = $1 and is_unattributed = false order by name",
    [tenantId],
  );
  return result.rows;
}

export type SnapshotSubscriptionRow = {
  id: string;
  tool: string;
  seat_count: number;
  unit_price: number;
  team_id: string | null;
};

/** Only read for an "auto" close — a backfill records seats as unavailable. */
export async function findSnapshotSubscriptions(
  tenantId: string,
): Promise<SnapshotSubscriptionRow[]> {
  const result = await backendPool().query<{
    id: string;
    tool: string;
    seat_count: number;
    unit_price: string | number;
    team_id: string | null;
  }>(
    "select id, tool, seat_count, unit_price, team_id from public.subscription where tenant_id = $1",
    [tenantId],
  );
  return result.rows.map((s) => ({
    id: s.id,
    tool: s.tool,
    seat_count: Number(s.seat_count),
    unit_price: Number(s.unit_price),
    team_id: s.team_id,
  }));
}

export type SnapshotUsageRow = {
  provider: string;
  project_id: string;
  derived_cost: number | null;
  uncosted: boolean;
};

export async function findSnapshotUsageForPeriod(
  tenantId: string,
  start: string,
  nextStartExclusive: string,
): Promise<SnapshotUsageRow[]> {
  const result = await backendPool().query<{
    provider: string;
    project_id: string;
    derived_cost: string | number | null;
    uncosted: boolean;
  }>(
    "select provider, project_id, derived_cost, uncosted from public.usage_daily where tenant_id = $1 and date >= $2 and date < $3",
    [tenantId, start, nextStartExclusive],
  );
  return result.rows.map((u) => ({
    provider: u.provider,
    project_id: u.project_id,
    derived_cost: u.derived_cost === null ? null : Number(u.derived_cost),
    uncosted: u.uncosted,
  }));
}

export async function findSnapshotCostsForPeriod(
  tenantId: string,
  start: string,
  nextStartExclusive: string,
): Promise<{ provider: string; amount: number }[]> {
  const result = await backendPool().query<{
    provider: string;
    amount: string | number;
  }>(
    "select provider, amount from public.cost_daily where tenant_id = $1 and date >= $2 and date < $3",
    [tenantId, start, nextStartExclusive],
  );
  return result.rows.map((c) => ({ provider: c.provider, amount: Number(c.amount) }));
}

export async function findSnapshotConnections(
  tenantId: string,
): Promise<{ provider: string; status: string; last_sync_at: string | null }[]> {
  const result = await backendPool().query<{
    provider: string;
    status: string;
    last_sync_at: string | null;
  }>(
    "select provider, status, last_sync_at from public.provider_connection where tenant_id = $1",
    [tenantId],
  );
  return result.rows;
}

/** Tenants that existed before the month ended — `created_at` strictly earlier
 *  than the month's first instant. */
export async function listTenantsExistingBefore(
  nextStart: string,
): Promise<string[]> {
  const result = await backendPool().query<{ id: string }>(
    "select id from public.tenant where created_at < $1",
    [`${nextStart}T00:00:00.000Z`],
  );
  return result.rows.map((r) => r.id);
}

export async function listClosedSnapshotMonths(
  tenantId: string,
): Promise<string[]> {
  const result = await backendPool().query<{ period_month: string }>(
    "select period_month from public.period_snapshot where tenant_id = $1",
    [tenantId],
  );
  return result.rows.map((r) => r.period_month);
}

/** Distinct months with reported API cost inside the backfill window, most
 *  recent first (the bounded backfill advances one month per run). */
export async function listMonthsWithCost(
  tenantId: string,
  since: string,
  beforeExclusive: string,
): Promise<string[]> {
  const result = await backendPool().query<{ date: string }>(
    "select date from public.cost_daily where tenant_id = $1 and date >= $2 and date < $3",
    [tenantId, since, beforeExclusive],
  );
  const months = new Set(result.rows.map((r) => `${r.date.slice(0, 7)}-01`));
  return [...months].sort().reverse();
}

// ---------------------------------------------------------------------------
// Roster mutations + public invite lookup (stage 9, closing the DB phase) —
// lib/roster/actions.ts and app/convite/[token]/page.tsx. The roster IMPORT
// itself stays on the user-scoped client by design: the roster_import RPC
// derives the tenant from the caller's session.
// ---------------------------------------------------------------------------

/** Tenant-scoped field update; returns matched rows (0 = unknown person). */
export async function updateEmployeeById(
  id: string,
  tenantId: string,
  patch: { name: string; email: string; team_id: string | null; updated_at: string },
): Promise<number> {
  const result = await backendPool().query(
    "update public.employee set name = $3, email = $4, team_id = $5, updated_at = $6 where id = $1 and tenant_id = $2",
    [id, tenantId, patch.name, patch.email, patch.team_id, patch.updated_at],
  );
  return result.rowCount ?? 0;
}

/** Removes one person; RETURNING supplies the email the audit trail names
 *  (#73). rowCount 0 = nothing matched (idempotent removal contract). */
export async function deleteEmployeeReturning(
  id: string,
  tenantId: string,
): Promise<{ count: number; row: { email: string } | null }> {
  const result = await backendPool().query<{ email: string }>(
    "delete from public.employee where id = $1 and tenant_id = $2 returning email",
    [id, tenantId],
  );
  const row = result.rows[0];
  return { count: result.rowCount ?? 0, row: row ? { email: row.email } : null };
}

export type InvitationLookupRow = {
  email: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  tenant_name: string | null;
};

function isoOrThrow(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  throw new Error("unexpected timestamp encoding from the driver");
}

/**
 * Public invite-page lookup by token HASH — never the plaintext token. The
 * join replaces PostgREST's embedded resource (tenant:tenant_id(name)); a
 * missing tenant name renders as the page's fallback copy. timestamptz arrives
 * as a Date over the wire; normalized back to ISO strings like PostgREST sent.
 */
export async function findInvitationByTokenHash(
  tokenHash: string,
): Promise<InvitationLookupRow | null> {
  const result = await backendPool().query<{
    email: string;
    expires_at: Date | string;
    accepted_at: Date | string | null;
    revoked_at: Date | string | null;
    tenant_name: string | null;
  }>(
    "select i.email, i.expires_at, i.accepted_at, i.revoked_at, t.name as tenant_name" +
      " from public.invitation i left join public.tenant t on t.id = i.tenant_id" +
      " where i.token_hash = $1 limit 1",
    [tokenHash],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    email: row.email,
    expires_at: isoOrThrow(row.expires_at),
    accepted_at: row.accepted_at === null ? null : isoOrThrow(row.accepted_at),
    revoked_at: row.revoked_at === null ? null : isoOrThrow(row.revoked_at),
    tenant_name: row.tenant_name,
  };
}

// ---------------------------------------------------------------------------
// Daily cron listing (stage 2) — app/api/cron/sync/route.ts.
// ---------------------------------------------------------------------------

export type ActiveConnection = { tenant_id: string; provider: string };

/** Every active connection across tenants — the deliberate cross-tenant read. */
export async function listActiveProviderConnections(): Promise<ActiveConnection[]> {
  const result = await backendPool().query<ActiveConnection>(
    "select tenant_id, provider from public.provider_connection where status = 'active'",
  );
  return result.rows;
}

/** Tenants with a budget this period (alerts run even for seats-only ones). */
export async function listBudgetTenantIds(periodMonth: string): Promise<string[]> {
  const result = await backendPool().query<{ tenant_id: string }>(
    "select tenant_id from public.budget where period_month = $1",
    [periodMonth],
  );
  return result.rows.map((r) => r.tenant_id);
}
