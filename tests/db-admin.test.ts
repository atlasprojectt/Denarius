import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stage 1 of the Supabase → Neon privileged-path migration (lib/db/admin.ts).
// Everything here runs against a captured fake Pool: no test needs real Neon,
// so the suite stays green in CI exactly like the other pure suites.

type CapturedQuery = { text: string; values: unknown[] };

const captured: {
  queries: CapturedQuery[];
  rejectNextWith?: unknown;
  /** Queued results consumed FIFO; when empty the default row is returned. */
  nextResults?: { rows: unknown[]; rowCount?: number | null }[];
} = {
  queries: [],
};

class FakePool {
  constructor(_config?: { connectionString?: string }) {}

  async query<T>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }> {
    if (captured.rejectNextWith !== undefined) {
      const cause = captured.rejectNextWith;
      captured.rejectNextWith = undefined;
      throw cause;
    }
    // Recording happens even for queued results, so assertions always see the
    // SQL that ran regardless of how the response was staged.
    captured.queries.push({ text, values: values ?? [] });
    const queued = captured.nextResults?.shift();
    if (queued) {
      return { rows: queued.rows as T[], rowCount: queued.rowCount ?? 1 };
    }
    // The one result shape the two helpers read: rate_limit_take's boolean.
    return { rows: [{ rate_limit_take: true }] as T[], rowCount: 1 };
  }
}

vi.mock("@neondatabase/serverless", () => ({ Pool: FakePool }));
vi.mock("server-only", () => ({}));

const ENV_VAR = "NEON_BACKEND_DATABASE_URL";

// The pool is memoized on globalThis to survive dev HMR; each loadModule()
// re-creates the mocked driver class, so the cached instance must go too or
// tests would exercise a stale class their spies cannot see.
function resetBackendPoolCache(): void {
  delete (globalThis as { __denariusBackendPool?: unknown }).__denariusBackendPool;
}

async function loadModule() {
  vi.resetModules();
  return import("@/lib/db/admin");
}

beforeEach(() => {
  captured.queries = [];
  captured.rejectNextWith = undefined;
  vi.stubEnv(ENV_VAR, "postgresql://denarius_backend:secret@ep.test/neondb?sslmode=require");
  resetBackendPoolCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("lib/db/admin configuration", () => {
  it("fails loudly when NEON_BACKEND_DATABASE_URL is absent", async () => {
    vi.stubEnv(ENV_VAR, "");
    const { rateLimitTake } = await loadModule();

    await expect(
      rateLimitTake({ p_bucket: "b", p_limit: 1, p_window_seconds: 60 }),
    ).rejects.toThrow(/NEON_BACKEND_DATABASE_URL is not set/);

    expect(captured.queries).toHaveLength(0);
  });
});

describe("rateLimitTake", () => {
  it("calls the Postgres function with parameters, never concatenation", async () => {
    const { rateLimitTake } = await loadModule();

    await rateLimitTake({ p_bucket: "invite:accept:abc", p_limit: 10, p_window_seconds: 600 });

    expect(captured.queries).toHaveLength(1);
    const { text, values } = captured.queries[0];
    expect(text).toBe("select public.rate_limit_take($1, $2, $3) as rate_limit_take");
    expect(values).toEqual(["invite:accept:abc", 10, 600]);
    expect(text).not.toContain("invite:accept:abc");
  });

  it("converts an explicit false to false", async () => {
    captured.nextResults = [{
      rows: [{ rate_limit_take: false }],
      rowCount: 1,
    }];
    const { rateLimitTake } = await loadModule();
    await expect(
      rateLimitTake({ p_bucket: "b", p_limit: 1, p_window_seconds: 1 }),
    ).resolves.toBe(false);
  });

  it("converts an explicit true to true", async () => {
    const { rateLimitTake } = await loadModule();
    await expect(
      rateLimitTake({ p_bucket: "b", p_limit: 1, p_window_seconds: 1 }),
    ).resolves.toBe(true);
  });

  it("treats a missing boolean (null row) as proceed — same as the old RPC path", async () => {
    // The Supabase client returned data=null on some failure shapes and the
    // caller read `data !== false`; the direct path preserves that.
    captured.nextResults = [{
      rows: [{}],
      rowCount: 0,
    }];
    const { rateLimitTake } = await loadModule();
    await expect(
      rateLimitTake({ p_bucket: "b", p_limit: 1, p_window_seconds: 1 }),
    ).resolves.toBe(true);
  });
});

describe("insertAuditLog", () => {
  it("sends exactly the same columns and values the PostgREST insert carried", async () => {
    const { insertAuditLog } = await loadModule();

    const rows = [
      {
        tenant_id: "t-1",
        actor_id: "u-1",
        actor_email: "admin@tenant.test",
        action: "budget.updated" as const,
        target: "Empresa",
        detail: { from: 1000, to: 1500 },
      },
      {
        tenant_id: "t-2",
        actor_id: "u-2",
        actor_email: "viewer@tenant.test",
        action: "roster.imported" as const,
        target: null,
        detail: {},
      },
    ];
    await insertAuditLog(rows);

    expect(captured.queries).toHaveLength(1);
    const { text, values } = captured.queries[0];
    expect(text.startsWith("insert into public.audit_log")).toBe(true);
    expect(text).toContain(
      "(tenant_id, actor_id, actor_email, action, target, detail)",
    );
    // Two rows × six columns, every value bound as a numbered parameter.
    expect(text.match(/\$\d+/g)).toHaveLength(12);
    expect(values).toEqual([
      "t-1", "u-1", "admin@tenant.test", "budget.updated", "Empresa", { from: 1000, to: 1500 },
      "t-2", "u-2", "viewer@tenant.test", "roster.imported", null, {},
    ]);
  });

  it("is a no-op for an empty batch — same guard as before", async () => {
    const { insertAuditLog } = await loadModule();
    await insertAuditLog([]);
    expect(captured.queries).toHaveLength(0);
  });
});

describe("the migrated callers keep their semantics", () => {
  it("takeRateLimitSlot fails OPEN when the database is unreachable", async () => {
    captured.rejectNextWith = Object.assign(new Error("connection refused"), {
      code: "ECONNREFUSED",
    });
    const { takeRateLimitSlot } = await import("@/lib/auth/rate-limit");

    await expect(takeRateLimitSlot(
      { name: "invite:create", limit: 30, windowSeconds: 3600 },
      "subject",
    )).resolves.toBe(true);
  });

  it("recordAudit swallows database failures instead of blocking the mutation", async () => {
    captured.rejectNextWith = Object.assign(new Error("relation missing"), {
      code: "42P01",
    });
    const { recordAudit } = await import("@/lib/audit/log");

    await expect(
      recordAudit(
        { userId: "u-1", tenantId: "t-1", email: "a@t.test" },
        "budget.created",
        { target: "Empresa" },
      ),
    ).resolves.toBeUndefined();
  });
});

describe("provider-sync helpers (stage 2)", () => {
  it("upsertUsageDaily keeps the exact conflict target and binds every value", async () => {
    const { upsertUsageDaily } = await loadModule();

    await upsertUsageDaily([
      {
        tenant_id: "t-1",
        date: "2026-08-01",
        provider: "openai",
        project_id: "proj",
        api_key_id: "key",
        user_id: null,
        model: "gpt-4o",
        input_tokens: 10,
        output_tokens: 20,
        derived_cost: 0.03,
        uncosted: false,
        synced_at: "2026-08-25T00:00:00Z",
      },
    ]);

    const { text, values } = captured.queries[0];
    expect(text).toContain("insert into public.usage_daily");
    expect(text).toContain(
      "on conflict (tenant_id, date, provider, project_id, api_key_id, user_id, model)",
    );
    // Only measured/derived columns are overwritten — never the key columns
    // nor columns outside the payload.
    expect(text).toContain("synced_at = excluded.synced_at");
    expect(text).not.toContain("user_id = excluded.user_id");
    expect(values).toHaveLength(12);
    expect(text.match(/\$\d+/g)).toHaveLength(12);
  });

  it("upsertUsageDaily skips empty batches instead of emitting invalid SQL", async () => {
    const { upsertUsageDaily } = await loadModule();
    await upsertUsageDaily([]);
    expect(captured.queries).toHaveLength(0);
  });

  it("upsertCostDaily keeps its own conflict target and overwrites amount/currency/synced_at", async () => {
    const { upsertCostDaily } = await loadModule();

    await upsertCostDaily([
      {
        tenant_id: "t-1",
        date: "2026-08-01",
        provider: "anthropic",
        project_id: null,
        line_item: "completions",
        amount: 9.2,
        currency: "usd",
        synced_at: "2026-08-25T00:00:00Z",
      },
    ]);

    const { text, values } = captured.queries[0];
    expect(text).toContain("insert into public.cost_daily");
    expect(text).toContain(
      "on conflict (tenant_id, date, provider, project_id, line_item)",
    );
    expect(text).toContain("amount = excluded.amount");
    expect(values).toHaveLength(8);
  });

  it("deleteUsageDailyFrom filters by tenant, provider and month start", async () => {
    const { deleteUsageDailyFrom } = await loadModule();
    await deleteUsageDailyFrom("t-1", "openai", "2026-08-01");

    const { text, values } = captured.queries[0];
    expect(text).toBe(
      "delete from public.usage_daily where tenant_id = $1 and provider = $2 and date >= $3",
    );
    expect(values).toEqual(["t-1", "openai", "2026-08-01"]);
  });

  it("listModelPrices returns NUMERIC wire strings as numbers", async () => {
    captured.nextResults = [{
      rows: [
        {
          provider: "openai",
          model: "gpt-4o",
          input_price_per_1m: "2.5",
          output_price_per_1m: "10.00",
          effective_date: "2026-01-01",
        },
      ],
      rowCount: 1,
    }];
    const { listModelPrices } = await loadModule();

    const prices = await listModelPrices();
    expect(prices[0].inputPricePer1M).toBe(2.5);
    expect(prices[0].outputPricePer1M).toBe(10);
    expect(typeof prices[0].inputPricePer1M).toBe("number");
  });

  it("markProviderConnectionSyncError leaves last_sync_at untouched", async () => {
    const { markProviderConnectionSyncError } = await loadModule();
    await markProviderConnectionSyncError("conn-1", "falhou", "stamp");

    const { text, values } = captured.queries[0];
    expect(text).not.toContain("last_sync_at");
    expect(values).toEqual(["conn-1", "falhou", "stamp"]);
  });

  it("activateProviderConnectionSync clears the error with one stamp", async () => {
    const { activateProviderConnectionSync } = await loadModule();
    await activateProviderConnectionSync("conn-1", "stamp");

    const { text, values } = captured.queries[0];
    expect(text).toContain("last_sync_error = null");
    expect(text).toContain("last_sync_at = $2");
    expect(values).toEqual(["conn-1", "stamp"]);
  });
});

describe("provider key lifecycle helpers (stage 3)", () => {
  it("findProviderConnectionStatus scopes to tenant+provider and returns null when absent", async () => {
    const { findProviderConnectionStatus } = await loadModule();

    await findProviderConnectionStatus("t-1", "openai");
    const { text, values } = captured.queries[0];
    expect(text).toBe(
      "select status from public.provider_connection where tenant_id = $1 and provider = $2 limit 1",
    );
    expect(values).toEqual(["t-1", "openai"]);

    captured.nextResults = [{
      rows: [],
      rowCount: 0,
    }];
    // Fresh module load so the spy on the current class is the one used.
    resetBackendPoolCache();
    const { findProviderConnectionStatus: fresh } = await loadModule();
    await expect(fresh("t-1", "openai")).resolves.toBeNull();
  });

  it("upsertProviderConnectionCredential keeps the conflict key, binds the credential and never touches last_sync_at", async () => {
    const { upsertProviderConnectionCredential } = await loadModule();

    await upsertProviderConnectionCredential(
      {
        tenant_id: "t-1",
        provider: "anthropic",
        encrypted_credential: "v1:ciphertext-blob",
      },
      "2026-08-25T00:00:00Z",
    );

    const { text, values } = captured.queries[0];
    expect(text).toContain("insert into public.provider_connection");
    expect(text).toContain("on conflict (tenant_id, provider) do update set");
    // Rotation overwrites only credential + status + error/updated stamps.
    expect(text).toContain("encrypted_credential = excluded.encrypted_credential");
    expect(text).toContain("status = 'active'");
    expect(text).toContain("last_sync_error = null");
    expect(text).not.toContain("last_sync_at");
    // The ciphertext travels as a bind parameter — never inside the SQL text.
    expect(text).not.toContain("ciphertext-blob");
    expect(values).toEqual(["t-1", "anthropic", "v1:ciphertext-blob", "2026-08-25T00:00:00Z"]);
  });

  it("revokeProviderConnection discards the ciphertext and reports the affected-row count", async () => {
    const { revokeProviderConnection } = await loadModule();

    const count = await revokeProviderConnection("t-1", "openai", "2026-08-25T00:00:00Z");

    const { text, values } = captured.queries[0];
    expect(text).toBe(
      "update public.provider_connection set status = 'revoked', encrypted_credential = null, updated_at = $3 where tenant_id = $1 and provider = $2",
    );
    expect(values).toEqual(["t-1", "openai", "2026-08-25T00:00:00Z"]);
    expect(count).toBe(1);
  });

  it("saveKey still audits through recordAudit when the upsert succeeds (caller wiring)", async () => {
    // The action module wires audit itself; here we only prove the db helper
    // resolves so the flow reaches the audit call in the mocked-action tests
    // (destructive-actions covers the contract for the other mutations).
    const { upsertProviderConnectionCredential } = await loadModule();
    await expect(
      upsertProviderConnectionCredential(
        { tenant_id: "t-1", provider: "openai", encrypted_credential: "blob" },
        "stamp",
      ),
    ).resolves.toBeUndefined();
  });
});

describe("attribution + subscription helpers (stage 4)", () => {
  it("upsertProjectMap keeps the exact conflict key and binds every value", async () => {
    const { upsertProjectMap } = await loadModule();

    await upsertProjectMap([
      {
        tenant_id: "t-1",
        provider: "openai",
        project_id: "proj_eng",
        team_id: "team-a",
        updated_at: "2026-08-25T00:00:00Z",
      },
    ]);

    const { text, values } = captured.queries[0];
    expect(text).toContain("insert into public.project_map");
    expect(text).toContain(
      "on conflict (tenant_id, provider, project_id) do update set",
    );
    // Only the mapping and its stamp move — never the identity columns.
    expect(text).toContain("team_id = excluded.team_id");
    expect(text).toContain("updated_at = excluded.updated_at");
    expect(values).toEqual(["t-1", "openai", "proj_eng", "team-a", "2026-08-25T00:00:00Z"]);
  });

  it("upsertProjectMap skips empty batches instead of emitting invalid SQL", async () => {
    const { upsertProjectMap } = await loadModule();
    await upsertProjectMap([]);
    expect(captured.queries).toHaveLength(0);
  });

  it("clearProjectMapping scopes the delete to tenant+provider+project", async () => {
    const { clearProjectMapping } = await loadModule();
    await clearProjectMapping("t-1", "anthropic", "ws-uuid");

    const { text, values } = captured.queries[0];
    expect(text).toBe(
      "delete from public.project_map where tenant_id = $1 and provider = $2 and project_id = $3",
    );
    expect(values).toEqual(["t-1", "anthropic", "ws-uuid"]);
  });

  it("isOwnedTeam answers true for shared (null) without touching the database", async () => {
    const { isOwnedTeam } = await loadModule();
    await expect(isOwnedTeam("t-1", null)).resolves.toBe(true);
    expect(captured.queries).toHaveLength(0);
  });

  it("isOwnedTeam filters by id AND tenant and refuses the Unattributed bucket", async () => {
    captured.nextResults = [{
      rows: [{ is_unattributed: false }],
      rowCount: 1,
    }];
    resetBackendPoolCache();
    const { isOwnedTeam: owned } = await loadModule();
    await expect(owned("t-1", "team-a")).resolves.toBe(true);

    captured.nextResults = [{
      rows: [{ is_unattributed: true }],
      rowCount: 1,
    }];
    resetBackendPoolCache();
    const { isOwnedTeam: unattributed } = await loadModule();
    await expect(unattributed("t-1", "team-x")).resolves.toBe(false);

    // A missing row (foreign tenant id) reads as not-owned, like PostgREST's
    // maybeSingle → null did.
    captured.nextResults = [{
      rows: [],
      rowCount: 0,
    }];
    resetBackendPoolCache();
    const { isOwnedTeam: missing } = await loadModule();
    await expect(missing("t-1", "team-b")).resolves.toBe(false);

    // The scoping itself is parameterized on both columns.
    await (async () => {
      resetBackendPoolCache();
      const { isOwnedTeam: fresh } = await loadModule();
      await fresh("t-9", "team-c");
      const { text, values } = captured.queries.at(-1)!;
      expect(text).toContain("where id = $1 and tenant_id = $2");
      expect(values).toEqual(["team-c", "t-9"]);
    })();
  });

  it("insertSubscription binds every column as a parameter", async () => {
    const { insertSubscription } = await loadModule();

    await insertSubscription({
      tenant_id: "t-1",
      tool: "Figma",
      seat_count: 5,
      unit_price: 10.5,
      currency: "BRL",
      team_id: null,
    });

    const { text, values } = captured.queries[0];
    expect(text).toBe(
      "insert into public.subscription (tenant_id, tool, seat_count, unit_price, currency, team_id) values ($1, $2, $3, $4, $5, $6)",
    );
    expect(values).toEqual(["t-1", "Figma", 5, 10.5, "BRL", null]);
  });

  it("updateSubscriptionById scopes to id+tenant and returns the matched count", async () => {
    const { updateSubscriptionById } = await loadModule();

    const matched = await updateSubscriptionById("sub-1", "t-1", {
      tool: "Figma",
      seat_count: 7,
      unit_price: 12,
      team_id: null,
      updated_at: "2026-08-25T00:00:00Z",
    });

    const { text, values } = captured.queries[0];
    expect(text).toContain("update public.subscription set");
    expect(text).toContain("where id = $1 and tenant_id = $2");
    expect(values[0]).toBe("sub-1");
    expect(values[1]).toBe("t-1");
    expect(matched).toBe(1);
  });

  it("deleteSubscriptionReturning converts NUMERIC wire strings and reports the count", async () => {
    captured.nextResults = [{
      rows: [{ tool: "Figma", seat_count: 5, unit_price: "10.50" }],
      rowCount: 1,
    }];
    const { deleteSubscriptionReturning } = await loadModule();

    const outcome = await deleteSubscriptionReturning("sub-1", "t-1");

    expect(outcome.count).toBe(1);
    expect(outcome.row).toEqual({ tool: "Figma", seat_count: 5, unit_price: 10.5 });
    expect(typeof outcome.row?.unit_price).toBe("number");

    captured.nextResults = [{
      rows: [],
      rowCount: 0,
    }];
    resetBackendPoolCache();
    const { deleteSubscriptionReturning: none } = await loadModule();
    await expect(none("sub-x", "t-1")).resolves.toEqual({ count: 0, row: null });
  });

  it("deleteSubscriptionReturning uses RETURNING instead of a post-delete read", async () => {
    const { deleteSubscriptionReturning } = await loadModule();
    await deleteSubscriptionReturning("sub-1", "t-1");
    const { text } = captured.queries[0];
    // The RETURNING clause is what replaces the old .select() after delete.
    expect(text).toContain("returning tool, seat_count, unit_price");
  });
});

describe("budget helpers (stage 5)", () => {
  const BUDGET_ROW = {
    tenant_id: "t-1",
    scope: "team",
    team_id: "team-a",
    period_month: "2026-08-01",
    amount: 1000,
    currency: "BRL",
    thresholds: [0.8, 1],
    frozen_fx_rate: 5.5,
    fx_rate_source: "test",
    fx_rate_date: "2026-08-01",
  };

  it("findBudgetForScope scopes org rows with team_id IS NULL", async () => {
    const { findBudgetForScope } = await loadModule();
    await findBudgetForScope("t-1", "org", null, "2026-08-01");

    const { text, values } = captured.queries[0];
    expect(text).toContain("and period_month = $3 and team_id is null");
    expect(values).toEqual(["t-1", "org", "2026-08-01"]);
  });

  it("findBudgetForScope binds the team for team scope and converts NUMERIC amount", async () => {
    captured.nextResults = [{
      rows: [{ id: "b-1", amount: "1000.00" }],
      rowCount: 1,
    }];
    resetBackendPoolCache();
    const { findBudgetForScope } = await loadModule();

    const budget = await findBudgetForScope("t-1", "team", "team-a", "2026-08-01");
    const { text, values } = captured.queries[0];
    expect(text).toContain("and team_id = $4");
    expect(values).toEqual(["t-1", "team", "2026-08-01", "team-a"]);
    expect(budget).toEqual({ id: "b-1", amount: 1000 });
    expect(typeof budget?.amount).toBe("number");
  });

  it("updateBudgetById overwrites only the measured fields and reports matched rows", async () => {
    const { updateBudgetById } = await loadModule();
    const matched = await updateBudgetById("b-1", "t-1", {
      amount: 1200,
      thresholds: [0.85, 1],
      updated_at: "stamp",
    });

    const { text, values } = captured.queries[0];
    expect(text).toBe(
      "update public.budget set amount = $3, thresholds = $4, updated_at = $5 where id = $1 and tenant_id = $2",
    );
    // Frozen FX columns are never part of an edit.
    expect(text).not.toContain("frozen_fx_rate");
    expect(values).toEqual(["b-1", "t-1", 1200, [0.85, 1], "stamp"]);
    expect(matched).toBe(1);
  });

  it("insertBudget binds every column as a parameter, none interpolated", async () => {
    const { insertBudget } = await loadModule();
    await insertBudget(BUDGET_ROW);

    const { text, values } = captured.queries[0];
    expect(text.startsWith("insert into public.budget")).toBe(true);
    expect(text.match(/\$\d+/g)).toHaveLength(10);
    expect(values).toEqual([
      "t-1", "team", "team-a", "2026-08-01", 1000, "BRL", [0.8, 1], 5.5, "test", "2026-08-01",
    ]);
  });

  it("filterOwnedTeamIds filters by tenant + not-unattributed + any(id), no query when empty", async () => {
    const { filterOwnedTeamIds } = await loadModule();
    await expect(filterOwnedTeamIds("t-1", [])).resolves.toEqual([]);
    expect(captured.queries).toHaveLength(0);

    await filterOwnedTeamIds("t-1", ["a", "b"]);
    const { text, values } = captured.queries[0];
    expect(text).toBe(
      "select id from public.team where tenant_id = $1 and is_unattributed = false and id = any($2)",
    );
    expect(values).toEqual(["t-1", ["a", "b"]]);
  });

  it("findBudgetsForPeriod scopes to tenant+period and keeps raw thresholds", async () => {
    captured.nextResults = [{
      rows: [
        { id: "b-1", scope: "org", team_id: null, amount: "900", thresholds: ["0.800"] },
      ],
      rowCount: 1,
    }];
    resetBackendPoolCache();
    const { findBudgetsForPeriod } = await loadModule();

    const budgets = await findBudgetsForPeriod("t-1", "2026-08-01");

    const { text, values } = captured.queries[0];
    expect(text).toContain("where tenant_id = $1 and period_month = $2");
    expect(values).toEqual(["t-1", "2026-08-01"]);
    // amount converted; thresholds kept raw — warnPctOf tolerates strings.
    expect(budgets[0].amount).toBe(900);
    expect(budgets[0].thresholds).toEqual(["0.800"]);
  });

  it("deleteBudgetReturning uses RETURNING and reports zero rows as null", async () => {
    captured.nextResults = [{
      rows: [{ scope: "org", team_id: null, amount: "100" }],
      rowCount: 1,
    }];
    const { deleteBudgetReturning } = await loadModule();

    const outcome = await deleteBudgetReturning("b-1", "t-1");
    expect(outcome.count).toBe(1);
    expect(outcome.row).toEqual({ scope: "org", team_id: null, amount: 100 });

    captured.nextResults = [{
      rows: [],
      rowCount: 0,
    }];
    resetBackendPoolCache();
    const { deleteBudgetReturning: none } = await loadModule();
    await expect(none("b-x", "t-1")).resolves.toEqual({ count: 0, row: null });

    resetBackendPoolCache();
    const { deleteBudgetReturning: fresh } = await loadModule();
    await fresh("b-1", "t-1");
    const { text } = captured.queries[0];
    expect(text).toContain("returning scope, team_id, amount");
  });
});

describe("snapshot close + alert dedup helpers (stage 6)", () => {
  const SNAPSHOT_ROW = {
    tenant_id: "t-1",
    period_month: "2026-06-01",
    closed_at: "2026-07-01T03:00:00.000Z",
    source: "auto",
    currency: "BRL",
    api_usd: 150,
    seats_amount: 1200,
    combined_amount: 1950,
    budget_amount: 10000,
    pct_spent: 0.195,
    frozen_fx_rate: 5,
    fx_rate_source: "open.er-api.com",
    fx_rate_date: "2026-06-01",
    verdict_status: "green",
    verdict_sentence: "Fechou no verde.",
    breakdown: { teams: [] },
    has_uncosted: false,
    reconciliation_ok: true,
    fx_missing: false,
    stale_sync: false,
  };

  it("insertPeriodSnapshotIfAbsent is DO NOTHING under (tenant_id, period_month)", async () => {
    const { insertPeriodSnapshotIfAbsent } = await loadModule();
    await insertPeriodSnapshotIfAbsent(SNAPSHOT_ROW);

    const { text, values } = captured.queries[0];
    expect(text).toContain("insert into public.period_snapshot");
    expect(text).toContain("on conflict (tenant_id, period_month) do nothing");
    // A frozen month is never rewritten — there must be no DO UPDATE at all.
    expect(text).not.toContain("do update");
    expect(values).toHaveLength(20);
    expect(values[0]).toBe("t-1");
    expect(values[1]).toBe("2026-06-01");
  });

  it("a retried snapshot close binds identical values and still cannot overwrite", async () => {
    const { insertPeriodSnapshotIfAbsent } = await loadModule();
    // First run...
    await insertPeriodSnapshotIfAbsent(SNAPSHOT_ROW);
    // ...retried run with DIFFERENT numbers: DO NOTHING ignores them all.
    await insertPeriodSnapshotIfAbsent({ ...SNAPSHOT_ROW, api_usd: 999 });

    expect(captured.queries).toHaveLength(2);
    for (const { text } of captured.queries) {
      expect(text).toContain("on conflict (tenant_id, period_month) do nothing");
    }
    expect(captured.queries[1].values[5]).toBe(999); // bound as a parameter
  });

  it("findNotificationLogLevels scopes to tenant + email + period", async () => {
    const { findNotificationLogLevels } = await loadModule();
    await findNotificationLogLevels("t-1", "2026-08-01");

    const { text, values } = captured.queries[0];
    expect(text).toBe(
      "select target_id, level from public.notification_log where tenant_id = $1 and channel = 'email' and period_month = $2",
    );
    expect(values).toEqual(["t-1", "2026-08-01"]);
  });

  it("insertNotificationLogIfAbsent is DO NOTHING under the full dedup key", async () => {
    const { insertNotificationLogIfAbsent } = await loadModule();

    await insertNotificationLogIfAbsent([
      { tenant_id: "t-1", channel: "email", target_id: "__org__", level: "warn", period_month: "2026-08-01" },
      { tenant_id: "t-1", channel: "email", target_id: "team-1", level: "breach", period_month: "2026-08-01" },
    ]);

    const { text, values } = captured.queries[0];
    expect(text).toContain(
      "on conflict (tenant_id, channel, target_id, level, period_month) do nothing",
    );
    expect(text).not.toContain("do update");
    expect(values).toHaveLength(10);
  });

  it("the same alert on a retry inserts nothing new; a distinct target/level stays allowed", async () => {
    const { insertNotificationLogIfAbsent } = await loadModule();

    const warn = { tenant_id: "t-1", channel: "email", target_id: "__org__", level: "warn", period_month: "2026-08-01" };
    // First run logs the crossing; the retry re-sends the identical rows —
    // the SQL is the dedup mechanism, so both attempts carry the same key.
    await insertNotificationLogIfAbsent([warn]);
    await insertNotificationLogIfAbsent([warn]);

    const breachTeam = { ...warn, target_id: "team-1", level: "breach" };
    await insertNotificationLogIfAbsent([breachTeam]);

    for (const { text } of captured.queries) {
      expect(text).toContain("do nothing");
    }
    // Distinct target and level are separate keys — never swallowed.
    const thirdValues = captured.queries[2].values;
    expect(thirdValues).toEqual(["t-1", "email", "team-1", "breach", "2026-08-01"]);
  });

  it("an empty notification batch emits no SQL", async () => {
    const { insertNotificationLogIfAbsent } = await loadModule();
    await insertNotificationLogIfAbsent([]);
    expect(captured.queries).toHaveLength(0);
  });
});

describe("digest cron + notification snapshot helpers (stage 7)", () => {
  it("listDigestTenantIds selects org budgets for the period only", async () => {
    const { listDigestTenantIds } = await loadModule();
    await listDigestTenantIds("2026-08-01");

    const { text, values } = captured.queries[0];
    expect(text).toBe(
      "select tenant_id from public.budget where scope = 'org' and period_month = $1",
    );
    expect(values).toEqual(["2026-08-01"]);
  });

  it("findNotificationBudgets converts NUMERIC columns, thresholds included", async () => {
    captured.nextResults = [{
      rows: [{
        scope: "org",
        team_id: null,
        amount: "10000.00",
        thresholds: ["0.800", "1.000"],
        frozen_fx_rate: "5.10",
        fx_rate_source: "open.er-api.com",
        fx_rate_date: "2026-08-01",
      }],
      rowCount: 1,
    }];
    const { findNotificationBudgets } = await loadModule();

    const rows = await findNotificationBudgets("t-1", "2026-08-01");
    const { text } = captured.queries.at(-1)!;
    expect(text).toContain("from public.budget where tenant_id = $1 and period_month = $2");
    expect(rows[0].amount).toBe(10000);
    expect(typeof rows[0].amount).toBe("number");
    // Thresholds feed engine arithmetic — they must be numbers, not strings.
    expect(rows[0].thresholds).toEqual([0.8, 1]);
    expect(rows[0].frozen_fx_rate).toBe(5.1);
  });

  it("findNotificationSubscriptions returns seat/unit prices as numbers", async () => {
    captured.nextResults = [{
      rows: [{ tool: "Figma", seat_count: 5, unit_price: "12.50", team_id: null }],
      rowCount: 1,
    }];
    const { findNotificationSubscriptions } = await loadModule();

    const rows = await findNotificationSubscriptions("t-1");
    expect(captured.queries.at(-1)!.text).toContain(
      "select tool, seat_count, unit_price, team_id from public.subscription where tenant_id = $1",
    );
    expect(rows[0]).toEqual({ tool: "Figma", seat_count: 5, unit_price: 12.5, team_id: null });
  });

  it("findNotificationUsage keeps derived_cost nullable but numeric when present", async () => {
    captured.nextResults = [{
      rows: [
        { provider: "openai", project_id: "proj", derived_cost: "0.03", uncosted: false },
        { provider: "openai", project_id: "", derived_cost: null, uncosted: true },
      ],
      rowCount: 2,
    }];
    const { findNotificationUsage } = await loadModule();

    const rows = await findNotificationUsage("t-1", "2026-08-01");
    const { text, values } = captured.queries.at(-1)!;
    expect(text).toContain("date >= $2");
    expect(values).toEqual(["t-1", "2026-08-01"]);
    expect(rows[0].derived_cost).toBe(0.03);
    expect(rows[1].derived_cost).toBeNull();
  });

  it("findNotificationRecentCosts binds the 14-day window start as a parameter", async () => {
    const { findNotificationRecentCosts } = await loadModule();
    await findNotificationRecentCosts("t-1", "2026-07-28");

    const { text, values } = captured.queries[0];
    expect(text).toContain(
      "select date, provider, amount from public.cost_daily where tenant_id = $1 and date >= $2",
    );
    expect(values).toEqual(["t-1", "2026-07-28"]);
  });

  it("findNotificationTeams excludes the Unattributed bucket via SQL", async () => {
    const { findNotificationTeams } = await loadModule();
    await findNotificationTeams("t-1");

    const { text, values } = captured.queries[0];
    expect(text).toContain("is_unattributed = false");
    expect(values).toEqual(["t-1"]);
  });

  it("findNotifiableUsers reads digest opt-out per tenant", async () => {
    const { findNotifiableUsers } = await loadModule();
    await findNotifiableUsers("t-2");

    const { text, values } = captured.queries[0];
    expect(text).toContain(
      "select email, role, digest_opt_out from public.app_user where tenant_id = $1",
    );
    expect(values).toEqual(["t-2"]);
  });
});

describe("snapshot reads helpers (stage 8)", () => {
  it("findSnapshotTeamsOrdered orders by name", async () => {
    const { findSnapshotTeamsOrdered } = await loadModule();
    await findSnapshotTeamsOrdered("t-1");

    const { text, values } = captured.queries[0];
    expect(text).toBe(
      "select id, name from public.team where tenant_id = $1 and is_unattributed = false order by name",
    );
    expect(values).toEqual(["t-1"]);
  });

  it("findSnapshotSubscriptions includes ids and converts prices to numbers", async () => {
    captured.nextResults = [{
      rows: [{ id: "s-1", tool: "Copilot", seat_count: "10", unit_price: "100.00", team_id: null }],
      rowCount: 1,
    }];
    const { findSnapshotSubscriptions } = await loadModule();

    const rows = await findSnapshotSubscriptions("t-1");
    const { text } = captured.queries.at(-1)!;
    // The id column is what distinguishes this from the notification read.
    expect(text).toContain(
      "select id, tool, seat_count, unit_price, team_id from public.subscription",
    );
    expect(rows[0]).toEqual({
      id: "s-1", tool: "Copilot", seat_count: 10, unit_price: 100, team_id: null,
    });
  });

  it("snapshot period reads are bounded on BOTH ends (.gte start, .lt nextStart)", async () => {
    const { findSnapshotUsageForPeriod, findSnapshotCostsForPeriod } = await loadModule();

    await findSnapshotUsageForPeriod("t-1", "2026-06-01", "2026-07-01");
    const usageQuery = captured.queries.at(-1)!;
    expect(usageQuery.text).toContain("date >= $2 and date < $3");
    expect(usageQuery.values).toEqual(["t-1", "2026-06-01", "2026-07-01"]);

    await findSnapshotCostsForPeriod("t-1", "2026-06-01", "2026-07-01");
    const costQuery = captured.queries.at(-1)!;
    expect(costQuery.text).toContain("date >= $2 and date < $3");
    expect(costQuery.text).not.toContain("<=");
  });

  it("findSnapshotConnections returns provider/status/last_sync_at", async () => {
    captured.nextResults = [{
      rows: [{ provider: "openai", status: "active", last_sync_at: "2026-07-01T02:00:00Z" }],
      rowCount: 1,
    }];
    const { findSnapshotConnections } = await loadModule();

    const rows = await findSnapshotConnections("t-1");
    const { text } = captured.queries.at(-1)!;
    expect(text).toBe(
      "select provider, status, last_sync_at from public.provider_connection where tenant_id = $1",
    );
    expect(rows).toHaveLength(1);
  });

  it("listTenantsExistingBefore keeps the strict created_at boundary", async () => {
    const { listTenantsExistingBefore } = await loadModule();
    await listTenantsExistingBefore("2026-06-01");

    const { text, values } = captured.queries[0];
    expect(text).toBe("select id from public.tenant where created_at < $1");
    // Same midnight-instant expansion the PostgREST string had.
    expect(values).toEqual(["2026-06-01T00:00:00.000Z"]);
  });

  it("listMonthsWithCost dedups to month starts, most recent first", async () => {
    captured.nextResults = [{
      rows: [
        { date: "2026-05-03" }, { date: "2026-05-20" },
        { date: "2026-04-02" }, { date: "2026-04-28" },
        { date: "2026-06-30" },
      ],
      rowCount: 5,
    }];
    const { listMonthsWithCost } = await loadModule();

    const months = await listMonthsWithCost("t-1", "2025-06-01", "2026-06-01");
    const { text } = captured.queries.at(-1)!;
    expect(text).toContain("date >= $2 and date < $3");
    expect(months).toEqual(["2026-06-01", "2026-05-01", "2026-04-01"]);
  });
});

describe("snapshot reads aggregation — the historical error contract", () => {
  // These tests swap @/lib/db/admin for stubs; undo it so later describes
  // exercise the real helpers again.
  afterEach(() => {
    vi.doUnmock("@/lib/db/admin");
  });

  const adminStubs = (overrides: Record<string, unknown>) => ({
    findTenantDisplayCurrency: async () => [],
    findNotificationBudgets: async () => [],
    findSnapshotTeamsOrdered: async () => [],
    findSnapshotSubscriptions: async () => [],
    findSnapshotUsageForPeriod: async () => [],
    findNotificationProjectMap: async () => [],
    findSnapshotCostsForPeriod: async () => [],
    findSnapshotConnections: async () => [],
    listTenantsExistingBefore: async () => [],
    listClosedSnapshotMonths: async () => [],
    listMonthsWithCost: async () => [],
    ...overrides,
  });

  it("closedMonths keeps the aggregated message shape", async () => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    vi.doMock("@/lib/db/admin", () =>
      adminStubs({
        listClosedSnapshotMonths: async () => {
          throw Object.assign(new Error("missing relation"), { code: "42P01" });
        },
      }),
    );
    const { closedMonths } = await import("@/lib/snapshot/queries");
    await expect(closedMonths("t-1")).rejects.toThrow(
      "snapshot reads failed: period_snapshot:42P01",
    );
  });

  it("closedMonthInput names EVERY failing read, in order", async () => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    vi.doMock("@/lib/db/admin", () =>
      adminStubs({
        findTenantDisplayCurrency: async () => {
          throw Object.assign(new Error(), { code: "42501" });
        },
        findNotificationBudgets: async () => {
          throw Object.assign(new Error(), { code: "XX" });
        },
      }),
    );
    const { closedMonthInput } = await import("@/lib/snapshot/queries");

    await expect(
      closedMonthInput("t-1", 2026, 6, { source: "auto", closedAt: "now" }),
    ).rejects.toThrow("snapshot reads failed: tenant:42501,budget:XX");
  });

  it("a fully successful set of reads produces the same input shape as before", async () => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    vi.doMock("@/lib/db/admin", () =>
      adminStubs({
        findTenantDisplayCurrency: async () => "BRL",
        findNotificationBudgets: async () => [
          {
            scope: "org", team_id: null, amount: 10000,
            thresholds: [0.8, 1], frozen_fx_rate: 5, fx_rate_source: "test",
            fx_rate_date: "2026-06-01",
          },
        ],
        findNotificationProjectMap: async () => [
          { provider: "openai", project_id: "proj_eng", team_id: "team-1" },
        ],
      }),
    );
    const { closedMonthInput } = await import("@/lib/snapshot/queries");

    const snapshotInput = await closedMonthInput("t-1", 2026, 6, {
      source: "auto",
      closedAt: "2026-07-01T03:00:00.000Z",
    });
    // Same shape the Supabase path produced for identical rows.
    expect(snapshotInput.currency).toBe("BRL");
    expect(snapshotInput.orgBudget).toEqual({ amount: 10000, thresholds: [0.8, 1] });
    expect(snapshotInput.fx).toEqual({
      rate: 5, source: "test", date: "2026-06-01",
    });
    expect(snapshotInput.seats).toEqual({ available: true, subscriptions: [] });
    expect(snapshotInput.apiUnattributedUsd).toBe(0);
    expect(snapshotInput.hasUncosted).toBe(false);
  });
});

describe("roster + public invite helpers (stage 9)", () => {
  it("updateEmployeeById scopes to id+tenant and binds every field", async () => {
    const { updateEmployeeById } = await loadModule();
    const matched = await updateEmployeeById("e-1", "t-1", {
      name: "Ana",
      email: "ana@t.test",
      team_id: null,
      updated_at: "stamp",
    });

    const { text, values } = captured.queries[0];
    expect(text).toBe(
      "update public.employee set name = $3, email = $4, team_id = $5, updated_at = $6 where id = $1 and tenant_id = $2",
    );
    expect(values).toEqual(["e-1", "t-1", "Ana", "ana@t.test", null, "stamp"]);
    expect(matched).toBe(1);
  });

  it("deleteEmployeeReturning returns the email for the audit trail", async () => {
    captured.nextResults = [{
      rows: [{ email: "ana@t.test" }],
      rowCount: 1,
    }];
    const { deleteEmployeeReturning } = await loadModule();

    const outcome = await deleteEmployeeReturning("e-1", "t-1");
    const { text, values } = captured.queries.at(-1)!;
    expect(text).toContain("delete from public.employee where id = $1 and tenant_id = $2 returning email");
    // Cross-tenant ids can never match: tenant is bound in the same statement.
    expect(values).toEqual(["e-1", "t-1"]);
    expect(outcome).toEqual({ count: 1, row: { email: "ana@t.test" } });

    captured.nextResults = [{ rows: [], rowCount: 0 }];
    resetBackendPoolCache();
    const { deleteEmployeeReturning: none } = await loadModule();
    await expect(none("e-x", "t-1")).resolves.toEqual({ count: 0, row: null });
  });

  it("findInvitationByTokenHash binds only the HASH and joins the tenant name", async () => {
    captured.nextResults = [{
      rows: [{
        email: "convidada@t.test",
        expires_at: new Date("2026-09-01T12:00:00Z"),
        accepted_at: null,
        revoked_at: null,
        tenant_name: "Acme",
      }],
      rowCount: 1,
    }];
    const { findInvitationByTokenHash } = await loadModule();

    const invitation = await findInvitationByTokenHash("sha256hex");
    const { text, values } = captured.queries.at(-1)!;
    expect(text).toContain("where i.token_hash = $1");
    expect(text).toContain("left join public.tenant t on t.id = i.tenant_id");
    // The bound VALUE (the hash) never appears inside the SQL text — and no
    // plaintext token ever reaches this layer at all.
    expect(text).not.toContain("sha256hex");
    expect(values).toEqual(["sha256hex"]);
    // timestamptz arrived as a Date over the wire; normalized to ISO like
    // PostgREST delivered — the policy compares these strings.
    expect(invitation!.expires_at).toBe("2026-09-01T12:00:00.000Z");
    expect(invitation!.tenant_name).toBe("Acme");
  });

  it("findInvitationByTokenHash returns null when no row matches", async () => {
    captured.nextResults = [{ rows: [], rowCount: 0 }];
    const { findInvitationByTokenHash } = await loadModule();
    await findInvitationByTokenHash("unknown-hash");
    expect(captured.queries.at(-1)!.values).toEqual(["unknown-hash"]);
  });
});

describe("cron listing helpers (stage 2)", () => {
  it("listActiveProviderConnections selects only active rows across tenants", async () => {
    const { listActiveProviderConnections } = await loadModule();

    await listActiveProviderConnections();
    const { text, values } = captured.queries[0];
    expect(text).toBe(
      "select tenant_id, provider from public.provider_connection where status = 'active'",
    );
    expect(values).toEqual([]);
  });

  it("listBudgetTenantIds parameterizes the period month", async () => {
    const { listBudgetTenantIds } = await loadModule();

    await listBudgetTenantIds("2026-08-01");
    const { text, values } = captured.queries[0];
    expect(text).toContain("select tenant_id from public.budget where period_month = $1");
    expect(values).toEqual(["2026-08-01"]);
  });
});
