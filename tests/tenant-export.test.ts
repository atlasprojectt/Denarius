import { describe, expect, it, vi } from "vitest";

import { tenantExportStream } from "@/lib/privacy/export";

type ExportClient = Parameters<typeof tenantExportStream>[0]["client"];
type Row = Record<string, unknown>;

const secretCredential = "sk-proj-this-must-never-be-exported";
const secretInviteHash = "0123456789abcdef0123456789abcdef";

function projected(row: Row, columns: string): Row {
  const wanted = columns.split(",").map((column) => column.trim());
  return Object.fromEntries(
    wanted.filter((column) => column in row).map((column) => [column, row[column]]),
  );
}

function exportClient(input?: {
  rows?: Record<string, Row[]>;
  selections?: { table: string; columns: string }[];
  ranges?: { table: string; from: number; to: number }[];
}): ExportClient {
  const rows: Record<string, Row[]> = {
    provider_connection: [
      {
        id: "provider-1",
        tenant_id: "tenant-A",
        provider: "openai",
        status: "active",
        encrypted_credential: secretCredential,
      },
    ],
    invitation: [
      {
        id: "invite-1",
        tenant_id: "tenant-A",
        email: "viewer@empresa.test",
        role: "viewer",
        token_hash: secretInviteHash,
      },
    ],
    employee: [
      {
        id: "employee-1",
        tenant_id: "tenant-A",
        team_id: "team-1",
        name: "Pessoa Real",
        email: "pessoa@empresa.test",
      },
    ],
    app_user: [
      {
        id: "app-user-1",
        tenant_id: "tenant-A",
        email: "admin@empresa.test",
        display_name: "Admin Real",
        role: "admin",
      },
    ],
    audit_log: [
      {
        id: "audit-1",
        tenant_id: "tenant-A",
        actor_id: "app-user-1",
        actor_email: "admin@empresa.test",
        action: "roster.employee_updated",
        target: "Pessoa Real",
        detail: { email: "pessoa@empresa.test" },
      },
    ],
    usage_daily: [
      {
        id: "usage-1",
        tenant_id: "tenant-A",
        user_id: "provider-user-sensitive",
        model: "gpt-5",
      },
    ],
    ...(input?.rows ?? {}),
  };

  return {
    from(table: string) {
      return {
        select(columns: string) {
          input?.selections?.push({ table, columns });
          const query = {
            eq() {
              return query;
            },
            order() {
              return query;
            },
            range(from: number, to: number) {
              input?.ranges?.push({ table, from, to });
              const page = (rows[table] ?? []).slice(from, to + 1);
              return Promise.resolve({
                data: page.map((row) => projected(row, columns)),
                error: null,
              });
            },
          };
          return query;
        },
      };
    },
    rpc() {
      return Promise.resolve({ data: [], error: null });
    },
  } as unknown as ExportClient;
}

async function readExport(input: {
  client: ExportClient;
  showNames: boolean;
  storePerPerson: boolean;
}): Promise<Record<string, unknown>> {
  const stream = tenantExportStream({
    client: input.client,
    tenantId: "tenant-A",
    privacy: {
      showNames: input.showNames,
      storePerPerson: input.storePerPerson,
    },
    generatedAt: "2026-08-07T12:00:00.000Z",
  });
  return (await new Response(stream).json()) as Record<string, unknown>;
}

describe("tenant export", () => {
  it("never selects or serializes a credential or invitation token hash", async () => {
    const selections: { table: string; columns: string }[] = [];
    const dump = await readExport({
      client: exportClient({ selections }),
      showNames: true,
      storePerPerson: true,
    });
    const serialized = JSON.stringify(dump);

    expect(serialized).not.toContain(secretCredential);
    expect(serialized).not.toContain(secretInviteHash);
    expect(
      selections.find((entry) => entry.table === "provider_connection")?.columns,
    ).not.toContain("encrypted_credential");
    expect(
      selections.find((entry) => entry.table === "invitation")?.columns,
    ).not.toContain("token_hash");
  });

  it("withholds roster names and aliases provider user ids when names are off", async () => {
    const dump = await readExport({
      client: exportClient(),
      showNames: false,
      storePerPerson: true,
    });
    const data = dump.data as Record<string, Row[]>;

    expect(data.employee[0]).not.toHaveProperty("name");
    expect(data.employee[0]).not.toHaveProperty("email");
    expect(data.app_user[0]).not.toHaveProperty("email");
    expect(data.app_user[0]).not.toHaveProperty("display_name");
    expect(data.invitation[0]).not.toHaveProperty("email");
    expect(data.audit_log[0]).not.toHaveProperty("actor_email");
    expect(data.audit_log[0]).not.toHaveProperty("target");
    expect(data.audit_log[0]).not.toHaveProperty("detail");
    expect(data.usage_daily[0]).not.toHaveProperty("user_id");
    expect(data.usage_daily[0]).toHaveProperty("person_ref", "pessoa-1");
    expect(JSON.stringify(dump)).not.toContain("provider-user-sensitive");
    expect(JSON.stringify(dump)).not.toContain("Pessoa Real");
    expect(JSON.stringify(dump)).not.toContain("@empresa.test");
  });

  it("does not even select person grain when storage is off", async () => {
    const selections: { table: string; columns: string }[] = [];
    await readExport({
      client: exportClient({ selections }),
      showNames: true,
      storePerPerson: false,
    });

    expect(
      selections.find((entry) => entry.table === "usage_daily")?.columns,
    ).not.toContain("user_id");
  });

  it("paginates large tables instead of collecting the whole dump in memory", async () => {
    const ranges: { table: string; from: number; to: number }[] = [];
    const costRows = Array.from({ length: 501 }, (_, index) => ({
      id: `cost-${index.toString().padStart(3, "0")}`,
      tenant_id: "tenant-A",
      amount: index,
    }));
    const dump = await readExport({
      client: exportClient({ rows: { cost_daily: costRows }, ranges }),
      showNames: true,
      storePerPerson: true,
    });
    const data = dump.data as Record<string, Row[]>;

    expect(data.cost_daily).toHaveLength(501);
    expect(ranges.filter((range) => range.table === "cost_daily")).toEqual([
      { table: "cost_daily", from: 0, to: 499 },
      { table: "cost_daily", from: 500, to: 999 },
    ]);
  });
});

describe("export authorization", () => {
  it("returns 403 for a Viewer before creating a database client", async () => {
    vi.resetModules();
    const createClient = vi.fn();
    vi.doMock("@/lib/auth/session", () => ({
      requireAdmin: async () => ({ error: "admin only" }),
    }));
    vi.doMock("@/lib/supabase/server", () => ({ createClient }));
    vi.doMock("@/lib/audit/log", () => ({ recordAudit: vi.fn() }));

    const { GET } = await import(
      "@/app/(app)/ajustes/privacidade/exportar/route"
    );
    const response = await GET();

    expect(response.status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
  });
});
