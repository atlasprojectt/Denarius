import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type SupabaseError = { code?: string; message?: string } | null;

function throwIfError(error: SupabaseError): void {
  if (error) throw error;
}

export type AuditLogInsert = {
  tenant_id: string;
  actor_id: string;
  actor_email: string;
  action: string;
  target: string | null;
  detail: unknown;
};

export async function insertAuditLog(rows: AuditLogInsert[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await createAdminClient().from("audit_log").insert(rows);
  throwIfError(error);
}

export type ProviderConnectionForSync = {
  id: string;
  encrypted_credential: string | null;
  status: string;
};

export async function findProviderConnectionForSync(
  tenantId: string,
  provider: string,
): Promise<ProviderConnectionForSync | null> {
  const { data, error } = await createAdminClient()
    .from("provider_connection")
    .select("id, encrypted_credential, status")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();
  throwIfError(error);
  return data;
}

export async function findTenantStorePerPerson(
  tenantId: string,
): Promise<boolean | null> {
  const { data, error } = await createAdminClient()
    .from("tenant")
    .select("store_per_person")
    .eq("id", tenantId)
    .maybeSingle();
  throwIfError(error);
  return data?.store_per_person ?? null;
}

export type SyncModelPrice = {
  provider: string;
  model: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
  effectiveDate: string;
};

export async function listModelPrices(): Promise<SyncModelPrice[]> {
  const { data, error } = await createAdminClient()
    .from("model_price")
    .select("provider, model, input_price_per_1m, output_price_per_1m, effective_date");
  throwIfError(error);
  return (data ?? []).map((row) => ({
    provider: row.provider,
    model: row.model,
    inputPricePer1M: Number(row.input_price_per_1m),
    outputPricePer1M: Number(row.output_price_per_1m),
    effectiveDate: row.effective_date,
  }));
}

export async function deleteUsageDailyFrom(
  tenantId: string,
  provider: string,
  fromDate: string,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("usage_daily")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .gte("date", fromDate);
  throwIfError(error);
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
  derived_cost: number | null;
  uncosted: boolean;
  synced_at: string;
};

export async function upsertUsageDaily(rows: UsageDailyUpsert[]): Promise<void> {
  if (rows.length === 0) return;
  const normalized = rows.map((row) => ({
    ...row,
    project_id: row.project_id ?? "",
    api_key_id: row.api_key_id ?? "",
    user_id: row.user_id ?? "",
  }));
  const { error } = await createAdminClient()
    .from("usage_daily")
    .upsert(normalized, {
      onConflict: "tenant_id,date,provider,project_id,api_key_id,user_id,model",
    });
  throwIfError(error);
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

export async function upsertCostDaily(rows: CostDailyUpsert[]): Promise<void> {
  if (rows.length === 0) return;
  const normalized = rows.map((row) => ({ ...row, project_id: row.project_id ?? "" }));
  const { error } = await createAdminClient()
    .from("cost_daily")
    .upsert(normalized, { onConflict: "tenant_id,date,provider,project_id,line_item" });
  throwIfError(error);
}

export async function markProviderConnectionSyncError(
  id: string,
  message: string,
  updatedAt: string,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("provider_connection")
    .update({ status: "error", last_sync_error: message, updated_at: updatedAt })
    .eq("id", id);
  throwIfError(error);
}

export async function activateProviderConnectionSync(
  id: string,
  syncedAt: string,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("provider_connection")
    .update({
      status: "active",
      last_sync_at: syncedAt,
      last_sync_error: null,
      updated_at: syncedAt,
    })
    .eq("id", id);
  throwIfError(error);
}

export async function findProviderConnectionStatus(
  tenantId: string,
  provider: string,
): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("provider_connection")
    .select("status")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();
  throwIfError(error);
  return data?.status ?? null;
}

export async function upsertProviderConnectionCredential(
  row: { tenant_id: string; provider: string; encrypted_credential: string },
  updatedAt: string,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("provider_connection")
    .upsert(
      {
        ...row,
        status: "active",
        last_sync_error: null,
        updated_at: updatedAt,
      },
      { onConflict: "tenant_id,provider" },
    );
  throwIfError(error);
}

export async function revokeProviderConnection(
  tenantId: string,
  provider: string,
  updatedAt: string,
): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("provider_connection")
    .update(
      { status: "revoked", encrypted_credential: null, updated_at: updatedAt },
      { count: "exact" },
    )
    .eq("tenant_id", tenantId)
    .eq("provider", provider);
  throwIfError(error);
  return count ?? 0;
}
