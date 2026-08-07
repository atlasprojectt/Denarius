import "server-only";

import type { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 500;

type TenantClient = Awaited<ReturnType<typeof createClient>>;
type ExportRow = Record<string, unknown>;
type ExportError = { code?: string; message: string };
type PageResult = { data: ExportRow[] | null; error: ExportError | null };
type RowTransform = (row: ExportRow) => ExportRow;

type ExportReader = {
  name: string;
  read: (from: number, to: number) => Promise<PageResult>;
  transform?: RowTransform;
};

export type TenantExportPrivacy = {
  showNames: boolean;
  storePerPerson: boolean;
};

function tableReader(
  client: TenantClient,
  input: {
    name: string;
    columns: string;
    tenantId: string;
    tenantColumn?: "id" | "tenant_id";
    transform?: RowTransform;
  },
): ExportReader {
  return {
    name: input.name,
    transform: input.transform,
    read: async (from, to) => {
      const { data, error } = await client
        .from(input.name)
        .select(input.columns)
        .eq(input.tenantColumn ?? "tenant_id", input.tenantId)
        .order("id")
        .range(from, to);
      return {
        data: (data ?? null) as ExportRow[] | null,
        error: error as ExportError | null,
      };
    },
  };
}

function notificationReader(client: TenantClient): ExportReader {
  return {
    name: "notification_log",
    read: async (from) => {
      const { data, error } = await client.rpc(
        "export_notification_log_page",
        {
          page_offset: from,
          page_limit: PAGE_SIZE,
        },
      );
      return {
        data: (data ?? null) as ExportRow[] | null,
        error: error as ExportError | null,
      };
    },
  };
}

function personReferenceTransform(): RowTransform {
  const aliases = new Map<string, string>();
  return (row) => {
    const raw = typeof row.user_id === "string" ? row.user_id : "";
    const { user_id: _withheld, ...safe } = row;
    if (raw === "") return safe;

    let personRef = aliases.get(raw);
    if (!personRef) {
      personRef = `pessoa-${aliases.size + 1}`;
      aliases.set(raw, personRef);
    }
    return { ...safe, person_ref: personRef };
  };
}

/**
 * Every tenant-owned table, with an explicit column allowlist. The allowlist is
 * the security boundary: encrypted_credential and invitation.token_hash never
 * enter memory, so a later serialization bug cannot leak either one.
 */
function readers(
  client: TenantClient,
  tenantId: string,
  privacy: TenantExportPrivacy,
): ExportReader[] {
  const appUserColumns = privacy.showNames
    ? "id, tenant_id, email, role, display_name, digest_opt_out, created_at"
    : "id, tenant_id, role, digest_opt_out, created_at";
  const employeeColumns = privacy.showNames
    ? "id, tenant_id, team_id, name, email, created_at, updated_at"
    : "id, tenant_id, team_id, created_at, updated_at";

  const usageBase =
    "id, tenant_id, date, provider, project_id, api_key_id, model, input_tokens, output_tokens, derived_cost, uncosted, synced_at";
  const usageColumns = privacy.storePerPerson
    ? `${usageBase}, user_id`
    : usageBase;
  const usageTransform =
    privacy.storePerPerson && !privacy.showNames
      ? personReferenceTransform()
      : undefined;
  const invitationColumns = privacy.showNames
    ? "id, tenant_id, email, role, invited_by, created_at, expires_at, accepted_at, revoked_at"
    : "id, tenant_id, role, invited_by, created_at, expires_at, accepted_at, revoked_at";
  const auditColumns = privacy.showNames
    ? "id, tenant_id, actor_id, actor_email, action, target, detail, created_at"
    : "id, tenant_id, actor_id, action, created_at";

  return [
    tableReader(client, {
      name: "tenant",
      columns:
        "id, name, display_currency, settings, show_names, store_per_person, created_at",
      tenantId,
      tenantColumn: "id",
    }),
    tableReader(client, {
      name: "app_user",
      columns: appUserColumns,
      tenantId,
    }),
    tableReader(client, {
      name: "team",
      columns: "id, tenant_id, name, is_unattributed, created_at",
      tenantId,
    }),
    tableReader(client, {
      name: "employee",
      columns: employeeColumns,
      tenantId,
    }),
    tableReader(client, {
      name: "subscription",
      columns:
        "id, tenant_id, tool, seat_count, unit_price, currency, team_id, created_at, updated_at",
      tenantId,
    }),
    tableReader(client, {
      name: "budget",
      columns:
        "id, tenant_id, scope, team_id, period_month, amount, currency, thresholds, frozen_fx_rate, fx_rate_source, fx_rate_date, created_at, updated_at",
      tenantId,
    }),
    tableReader(client, {
      name: "project_map",
      columns:
        "id, tenant_id, provider, project_id, team_id, created_at, updated_at",
      tenantId,
    }),
    tableReader(client, {
      name: "provider_connection",
      columns:
        "id, tenant_id, provider, status, last_sync_at, last_sync_error, created_at, updated_at",
      tenantId,
    }),
    tableReader(client, {
      name: "usage_daily",
      columns: usageColumns,
      tenantId,
      transform: usageTransform,
    }),
    tableReader(client, {
      name: "cost_daily",
      columns:
        "id, tenant_id, date, provider, project_id, line_item, amount, currency, synced_at",
      tenantId,
    }),
    notificationReader(client),
    tableReader(client, {
      name: "invitation",
      columns: invitationColumns,
      tenantId,
    }),
    tableReader(client, {
      name: "audit_log",
      columns: auditColumns,
      tenantId,
    }),
    tableReader(client, {
      name: "period_snapshot",
      columns:
        "id, tenant_id, period_month, closed_at, source, currency, api_usd, seats_amount, combined_amount, budget_amount, pct_spent, frozen_fx_rate, fx_rate_source, fx_rate_date, verdict_status, verdict_sentence, breakdown, has_uncosted, reconciliation_ok, fx_missing, stale_sync",
      tenantId,
    }),
  ];
}

function write(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  value: string,
): void {
  controller.enqueue(encoder.encode(value));
}

/**
 * Streams one valid JSON document. Only one 500-row page is held in memory at
 * a time; the export therefore grows with the response, not the serverless
 * function's heap. A failed table read aborts the download instead of silently
 * returning an incomplete dump that looks complete.
 */
export function tenantExportStream(input: {
  client: TenantClient;
  tenantId: string;
  privacy: TenantExportPrivacy;
  generatedAt: string;
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const exportReaders = readers(input.client, input.tenantId, input.privacy);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        write(
          controller,
          encoder,
          `${JSON.stringify({
            format_version: 1,
            generated_at: input.generatedAt,
            privacy: {
              show_names: input.privacy.showNames,
              store_per_person: input.privacy.storePerPerson,
              individual_names_withheld: !input.privacy.showNames,
            },
          }).slice(0, -1)},"data":{`,
        );

        for (let readerIndex = 0; readerIndex < exportReaders.length; readerIndex += 1) {
          const reader = exportReaders[readerIndex];
          write(
            controller,
            encoder,
            `${readerIndex === 0 ? "" : ","}${JSON.stringify(reader.name)}:[`,
          );

          let offset = 0;
          let firstRow = true;
          while (true) {
            const { data, error } = await reader.read(
              offset,
              offset + PAGE_SIZE - 1,
            );
            if (error) {
              throw new Error(`Tenant export failed while reading ${reader.name}`);
            }

            const page = data ?? [];
            for (const sourceRow of page) {
              const row = reader.transform
                ? reader.transform(sourceRow)
                : sourceRow;
              write(
                controller,
                encoder,
                `${firstRow ? "" : ","}${JSON.stringify(row)}`,
              );
              firstRow = false;
            }

            if (page.length < PAGE_SIZE) break;
            offset += page.length;
          }

          write(controller, encoder, "]");
        }

        write(controller, encoder, "}}");
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
