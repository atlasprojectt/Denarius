import { beforeEach, describe, expect, it, vi } from "vitest";

import { freshness } from "@/lib/engine/freshness";

// WP2 of the 2026-07-11 audit plan (QA-02): a successful sync must move the
// connection, cost and usage state together — one timestamp for the whole run —
// so the freshness banner and the totals can never disagree; a failed provider
// must stay accurately represented while another succeeds. runProviderSync is
// exercised over an in-memory Supabase stub and a deterministic fake provider.

type WriteLog = {
  usageDeleted: boolean;
  usageRows: Record<string, unknown>[];
  costRows: Record<string, unknown>[];
  connectionUpdates: Record<string, unknown>[];
};

const state = vi.hoisted(() => ({
  connection: {
    id: "conn-1",
    encrypted_credential: "ciphertext",
    status: "active",
  } as Record<string, unknown> | null,
  storePerPerson: true,
  prices: [
    {
      provider: "openai",
      model: "gpt-4o",
      input_price_per_1m: 2.5,
      output_price_per_1m: 10,
      effective_date: "2026-01-01",
    },
  ],
  log: {
    usageDeleted: false,
    usageRows: [],
    costRows: [],
    connectionUpdates: [],
  } as WriteLog,
  providerThrows: false,
}));

function resetState(): void {
  state.connection = {
    id: "conn-1",
    encrypted_credential: "ciphertext",
    status: "active",
  };
  state.storePerPerson = true;
  state.log = {
    usageDeleted: false,
    usageRows: [],
    costRows: [],
    connectionUpdates: [],
  };
  state.providerThrows = false;
}

// Minimal chainable query stub: records writes, answers the exact reads
// runProviderSync performs, and resolves like the supabase-js builder.
function makeQuery(table: string) {
  const ops: { name: string; args: unknown[] }[] = [];
  const push =
    (name: string) =>
    (...args: unknown[]) => {
      ops.push({ name, args });
      return query;
    };
  const resolve = () => {
    const has = (name: string) => ops.some((o) => o.name === name);
    if (table === "provider_connection" && has("update")) {
      const payload = ops.find((o) => o.name === "update")!.args[0] as Record<
        string,
        unknown
      >;
      state.log.connectionUpdates.push(payload);
      return { data: null, error: null };
    }
    if (table === "provider_connection") {
      return { data: state.connection, error: null };
    }
    if (table === "tenant") {
      return { data: { store_per_person: state.storePerPerson }, error: null };
    }
    if (table === "model_price") return { data: state.prices, error: null };
    if (table === "usage_daily" && has("delete")) {
      state.log.usageDeleted = true;
      return { data: null, error: null };
    }
    if (table === "usage_daily" && has("upsert")) {
      state.log.usageRows = ops.find((o) => o.name === "upsert")!
        .args[0] as Record<string, unknown>[];
      return { data: null, error: null };
    }
    if (table === "cost_daily" && has("upsert")) {
      state.log.costRows = ops.find((o) => o.name === "upsert")!
        .args[0] as Record<string, unknown>[];
      return { data: null, error: null };
    }
    return { data: null, error: null };
  };
  const query = {
    select: push("select"),
    eq: push("eq"),
    gte: push("gte"),
    update: push("update"),
    upsert: push("upsert"),
    delete: push("delete"),
    maybeSingle: () => Promise.resolve(resolve()),
    then: (onFulfilled: (value: unknown) => unknown) =>
      Promise.resolve(resolve()).then(onFulfilled),
  };
  return query;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (table: string) => makeQuery(table) }),
}));
vi.mock("@/lib/crypto", () => ({
  decryptCredential: () => "sk-fake-demo",
}));
vi.mock("@/lib/connectors", () => ({
  providerFor: () => ({
    fetchUsage: async () => {
      if (state.providerThrows) throw new Error("HTTP 401");
      return [
        {
          date: "2026-07-10",
          projectId: "proj_eng",
          apiKeyId: "key_1",
          userId: "user_ana",
          model: "gpt-4o",
          inputTokens: 1_000_000,
          outputTokens: 100_000,
        },
      ];
    },
    fetchCosts: async () => [
      {
        date: "2026-07-10",
        projectId: "proj_eng",
        lineItem: "completions",
        amount: 9.2,
        currency: "usd",
      },
    ],
  }),
}));

import { runProviderSync } from "@/lib/sync/provider-sync";

beforeEach(resetState);

describe("runProviderSync — coherent state after a successful sync (QA-02)", () => {
  it("stamps connection, usage and cost with the SAME sync time", async () => {
    const result = await runProviderSync("tenant-1", "openai");
    expect(result.ok).toBe(true);

    const update = state.log.connectionUpdates.at(-1)!;
    expect(update.status).toBe("active");
    expect(update.last_sync_error).toBeNull();

    const stamp = update.last_sync_at as string;
    expect(stamp).toBeTruthy();
    for (const row of state.log.usageRows) expect(row.synced_at).toBe(stamp);
    for (const row of state.log.costRows) expect(row.synced_at).toBe(stamp);
  });

  it("replaces the month's usage slice before inserting (idempotent re-sync)", async () => {
    await runProviderSync("tenant-1", "openai");
    expect(state.log.usageDeleted).toBe(true);
    expect(state.log.usageRows.length).toBeGreaterThan(0);
  });

  it("clears the freshness banner once the updated connection is re-read", async () => {
    await runProviderSync("tenant-1", "openai");
    const update = state.log.connectionUpdates.at(-1)!;

    const fresh = freshness([
      {
        provider: "openai",
        status: update.status as string,
        lastSyncAt: update.last_sync_at as string,
      },
    ]);
    expect(fresh.showBanner).toBe(false);
  });
});

describe("runProviderSync — failure stays accurately represented", () => {
  it("marks the connection error and keeps the message secret-free", async () => {
    state.providerThrows = true;
    const result = await runProviderSync("tenant-1", "openai");
    expect(result.ok).toBe(false);

    const update = state.log.connectionUpdates.at(-1)!;
    expect(update.status).toBe("error");
    expect(String(update.last_sync_error)).not.toContain("sk-");
  });

  it("one failed provider does not hide nor un-fail the other (banner honesty)", async () => {
    state.providerThrows = true;
    await runProviderSync("tenant-1", "openai");
    const failedUpdate = state.log.connectionUpdates.at(-1)!;

    const fresh = freshness([
      {
        provider: "openai",
        status: failedUpdate.status as string,
        lastSyncAt: null,
      },
      {
        provider: "anthropic",
        status: "active",
        lastSyncAt: new Date().toISOString(),
      },
    ]);
    expect(fresh.showBanner).toBe(true);
    expect(fresh.needsAttention.map((c) => c.provider)).toEqual(["openai"]);
  });

  it("refuses to run against a revoked or missing connection", async () => {
    state.connection = null;
    const result = await runProviderSync("tenant-1", "openai");
    expect(result.ok).toBe(false);
  });
});
