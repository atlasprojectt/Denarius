import "server-only";

import { providerFor } from "@/lib/connectors";
import { decryptCredential } from "@/lib/crypto";
import { deriveCost, type ModelPrice } from "@/lib/engine/derive";
import { monthToDateRange } from "@/lib/engine/period";
import { collapsePersonGrain } from "@/lib/privacy/minimize";
import { createAdminClient } from "@/lib/supabase/admin";

// On-demand sync for ONE tenant's connection to ONE provider (connect button /
// rotate / sync-now). Provider-agnostic: everything specific lives behind the
// UsageProvider seam. The daily cross-tenant cron arrives with issue #17 and
// reuses this per-tenant unit. Upserts are idempotent by the natural keys, so
// a re-sync never duplicates a bucket.

export type ProviderName = "openai" | "anthropic";

export type SyncResult =
  | { ok: true; usageRows: number; costRows: number; monthUsd: number }
  | { ok: false; error: string };

type ConnectionRow = {
  id: string;
  encrypted_credential: string | null;
  status: string;
};

type PriceRow = {
  provider: string;
  model: string;
  input_price_per_1m: number;
  output_price_per_1m: number;
  effective_date: string;
};

export async function runProviderSync(
  tenantId: string,
  providerName: ProviderName,
): Promise<SyncResult> {
  const admin = createAdminClient();

  const [{ data: connectionData }, { data: tenantData }] = await Promise.all([
    admin
      .from("provider_connection")
      .select("id, encrypted_credential, status")
      .eq("tenant_id", tenantId)
      .eq("provider", providerName)
      .maybeSingle(),
    admin.from("tenant").select("store_per_person").eq("id", tenantId).maybeSingle(),
  ]);
  const connection = connectionData as ConnectionRow | null;
  // Data minimization (#23): default on if the tenant row is somehow missing.
  const storePerPerson =
    (tenantData as { store_per_person: boolean } | null)?.store_per_person ?? true;
  if (!connection || connection.status === "revoked" || !connection.encrypted_credential) {
    return { ok: false, error: `no active ${providerName} connection` };
  }

  const markError = async (message: string): Promise<SyncResult> => {
    await admin
      .from("provider_connection")
      .update({
        status: "error",
        last_sync_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    return { ok: false, error: message };
  };

  try {
    const provider = providerFor(
      providerName,
      decryptCredential(connection.encrypted_credential),
    );
    const range = monthToDateRange();
    // One stamp per sync: every row written by this run carries the same time.
    const syncedAt = new Date().toISOString();

    const [rawUsage, costs, { data: priceData }] = await Promise.all([
      provider.fetchUsage(range),
      provider.fetchCosts(range),
      admin
        .from("model_price")
        .select("provider, model, input_price_per_1m, output_price_per_1m, effective_date"),
    ]);

    // "Store per-person data" off → collapse to team/project grain before any
    // person-grain row is derived or persisted (aggregates stay exact).
    const usage = storePerPerson ? rawUsage : collapsePersonGrain(rawUsage);

    const prices: ModelPrice[] = ((priceData ?? []) as PriceRow[]).map((p) => ({
      provider: p.provider,
      model: p.model,
      inputPricePer1M: p.input_price_per_1m,
      outputPricePer1M: p.output_price_per_1m,
      effectiveDate: p.effective_date,
    }));

    const usageRows = usage.map((bucket) => {
      const derived = deriveCost(
        { provider: providerName, model: bucket.model, date: bucket.date, inputTokens: bucket.inputTokens, outputTokens: bucket.outputTokens },
        prices,
      );
      return {
        tenant_id: tenantId,
        date: bucket.date,
        provider: providerName,
        project_id: bucket.projectId,
        api_key_id: bucket.apiKeyId,
        user_id: bucket.userId,
        model: bucket.model,
        input_tokens: bucket.inputTokens,
        output_tokens: bucket.outputTokens,
        derived_cost: derived.cost,
        uncosted: derived.uncosted,
        synced_at: syncedAt,
      };
    });

    const costRows = costs.map((bucket) => ({
      tenant_id: tenantId,
      date: bucket.date,
      provider: providerName,
      project_id: bucket.projectId,
      line_item: bucket.lineItem,
      amount: bucket.amount,
      currency: bucket.currency,
      synced_at: syncedAt,
    }));

    // Independent tables — the two upserts run in parallel.
    const noError = { error: null };
    const [usageResult, costResult] = await Promise.all([
      usageRows.length > 0
        ? admin.from("usage_daily").upsert(usageRows, {
            onConflict:
              "tenant_id,date,provider,project_id,api_key_id,user_id,model",
          })
        : Promise.resolve(noError),
      costRows.length > 0
        ? admin.from("cost_daily").upsert(costRows, {
            onConflict: "tenant_id,date,provider,project_id,line_item",
          })
        : Promise.resolve(noError),
    ]);
    if (usageResult.error) {
      return markError(`usage upsert failed: ${usageResult.error.code}`);
    }
    if (costResult.error) {
      return markError(`cost upsert failed: ${costResult.error.code}`);
    }

    await admin
      .from("provider_connection")
      .update({
        status: "active",
        last_sync_at: syncedAt,
        last_sync_error: null,
        updated_at: syncedAt,
      })
      .eq("id", connection.id);

    const monthUsd = costs.reduce((sum, c) => sum + c.amount, 0);
    return { ok: true, usageRows: usageRows.length, costRows: costRows.length, monthUsd };
  } catch (cause) {
    // Never leak the key or raw payloads into errors shown/logged.
    const message = cause instanceof Error ? cause.message : "sync failed";
    return markError(message);
  }
}
