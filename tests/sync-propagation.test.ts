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
  decryptThrows: false,
  keyringThrows: false,
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
  state.decryptThrows = false;
  state.keyringThrows = false;
}

// Minimal in-memory stand-in for the Neon admin helpers: records writes,
// answers the exact reads runProviderSync performs.
vi.mock("@/lib/db/admin", () => ({
  findProviderConnectionForSync: async () => state.connection,
  findTenantStorePerPerson: async () =>
    state.connection === null ? null : state.storePerPerson,
  listModelPrices: async () =>
    state.prices.map((p) => ({
      provider: p.provider,
      model: p.model,
      inputPricePer1M: p.input_price_per_1m,
      outputPricePer1M: p.output_price_per_1m,
      effectiveDate: p.effective_date,
    })),
  deleteUsageDailyFrom: async () => {
    state.log.usageDeleted = true;
  },
  upsertUsageDaily: async (rows: Record<string, unknown>[]) => {
    state.log.usageRows = rows;
  },
  upsertCostDaily: async (rows: Record<string, unknown>[]) => {
    state.log.costRows = rows;
  },
  markProviderConnectionSyncError: async (
    _id: string,
    message: string,
    updatedAt: string,
  ) => {
    state.log.connectionUpdates.push({
      status: "error",
      last_sync_error: message,
      updated_at: updatedAt,
    });
  },
  activateProviderConnectionSync: async (_id: string, syncedAt: string) => {
    state.log.connectionUpdates.push({
      status: "active",
      last_sync_at: syncedAt,
      last_sync_error: null,
      updated_at: syncedAt,
    });
  },
}));
// Hoisted with the mock factory: a top-level class declaration is not yet
// initialised when vi.mock runs.
const { FakeKeyringError } = vi.hoisted(() => ({
  FakeKeyringError: class FakeKeyringError extends Error {},
}));

vi.mock("@/lib/crypto", () => ({
  CredentialKeyringError: FakeKeyringError,
  decryptCredential: () => {
    // What the keyring throws when the env itself is malformed (#75).
    if (state.keyringThrows) throw new FakeKeyringError("KEYS entries must be <id>:<key>");
    // What it throws when no configured key can open the blob.
    if (state.decryptThrows) throw new Error("credential could not be decrypted");
    return "sk-fake-demo";
  },
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

import {
  CREDENTIAL_CONFIG_MESSAGE,
  runProviderSync,
  UNREADABLE_CREDENTIAL_MESSAGE,
} from "@/lib/sync/provider-sync";

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

describe("runProviderSync — an unreadable credential degrades, never cascades (#75)", () => {
  it("marks the connection for reconnection instead of throwing", async () => {
    state.decryptThrows = true;

    const result = await runProviderSync("tenant-1", "openai");

    expect(result.ok).toBe(false);
    const update = state.log.connectionUpdates.at(-1)!;
    // "error" is the status the freshness banner turns into "Reconectar", and
    // the message the card prints tells the Admin exactly that.
    expect(update.status).toBe("error");
    expect(update.last_sync_error).toBe(UNREADABLE_CREDENTIAL_MESSAGE);
    expect(String(update.last_sync_error)).not.toContain("sk-");
    expect(freshness([
      { provider: "openai", status: update.status as string, lastSyncAt: null },
    ]).needsAttention.map((c) => c.provider)).toEqual(["openai"]);
  });

  it("does not stop the cron for the next tenant in the loop", async () => {
    state.decryptThrows = true;
    const stranded = await runProviderSync("tenant-1", "openai");
    expect(stranded.ok).toBe(false);

    // The cron iterates tenants sequentially; the next one holds a readable key.
    state.decryptThrows = false;
    const healthy = await runProviderSync("tenant-2", "openai");
    expect(healthy.ok).toBe(true);
    expect(state.log.connectionUpdates.at(-1)!.status).toBe("active");
  });
});

describe("runProviderSync — a misconfigured keyring is not the customer's fault (#75)", () => {
  it("does not tell the tenant to reconnect a key that was never the problem", async () => {
    state.keyringThrows = true;

    const result = await runProviderSync("tenant-1", "openai");

    expect(result.ok).toBe(false);
    const update = state.log.connectionUpdates.at(-1)!;
    expect(update.last_sync_error).toBe(CREDENTIAL_CONFIG_MESSAGE);
    expect(update.last_sync_error).not.toBe(UNREADABLE_CREDENTIAL_MESSAGE);
    // The variable name and its contents are the operator's business, not
    // something to print on a customer's connections card.
    expect(String(update.last_sync_error)).not.toMatch(/CREDENTIAL_|<id>:<key>/);
  });
});
