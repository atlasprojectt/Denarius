import { beforeEach, describe, expect, it, vi } from "vitest";

const createAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));

import {
  insertAuditLog,
  upsertProviderConnectionCredential,
  upsertUsageDaily,
} from "@/lib/db/supabase-admin";

type QueryResult = { data: unknown; error: { code: string } | null };

function queueResult(result: QueryResult) {
  const calls: { method: string; args: unknown[] }[] = [];
  createAdminClientMock.mockImplementation(() => {
    const builder = {
      from: (...args: unknown[]) => {
        calls.push({ method: "from", args });
        return builder;
      },
      insert: (...args: unknown[]) => {
        calls.push({ method: "insert", args });
        return builder;
      },
      upsert: (...args: unknown[]) => {
        calls.push({ method: "upsert", args });
        return builder;
      },
      then: (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve),
    };
    return builder;
  });
  return calls;
}

describe("Supabase admin adapter", () => {
  beforeEach(() => createAdminClientMock.mockReset());

  it("stores provider credentials in the same tenant database as reads", async () => {
    const calls = queueResult({ data: null, error: null });
    const row = {
      tenant_id: "tenant-a",
      provider: "openai",
      encrypted_credential: "ciphertext",
    };

    await upsertProviderConnectionCredential(row, "2026-10-02T12:00:00.000Z");

    expect(calls).toContainEqual({ method: "from", args: ["provider_connection"] });
    expect(calls).toContainEqual({
      method: "upsert",
      args: [
        {
          ...row,
          status: "active",
          last_sync_error: null,
          updated_at: "2026-10-02T12:00:00.000Z",
        },
        { onConflict: "tenant_id,provider" },
      ],
    });
  });

  it("writes audit rows through Supabase", async () => {
    const calls = queueResult({ data: null, error: null });
    const rows = [
      {
        tenant_id: "tenant-a",
        actor_id: "user-a",
        actor_email: "admin@example.test",
        action: "provider.key_saved",
        target: "OpenAI",
        detail: { provider: "openai" },
      },
    ];

    await insertAuditLog(rows);

    expect(calls).toContainEqual({ method: "from", args: ["audit_log"] });
    expect(calls).toContainEqual({ method: "insert", args: [rows] });
  });

  it("normalizes nullable provider sub-keys before the not-null upsert", async () => {
    const calls = queueResult({ data: null, error: null });
    await upsertUsageDaily([
      {
        tenant_id: "tenant-a",
        date: "2026-10-01",
        provider: "openai",
        project_id: null,
        api_key_id: null,
        user_id: null,
        model: "gpt-4o",
        input_tokens: 1,
        output_tokens: 2,
        derived_cost: 0.01,
        uncosted: false,
        synced_at: "2026-10-02T12:00:00.000Z",
      },
    ]);

    expect(calls).toContainEqual({
      method: "upsert",
      args: [
        [
          expect.objectContaining({
            project_id: "",
            api_key_id: "",
            user_id: "",
          }),
        ],
        { onConflict: "tenant_id,date,provider,project_id,api_key_id,user_id,model" },
      ],
    });
  });
});
