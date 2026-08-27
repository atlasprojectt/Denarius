import "server-only";

import { providerFor } from "@/lib/connectors";
import { CredentialKeyringError, decryptCredential } from "@/lib/crypto";
import { deriveCost, type ModelPrice } from "@/lib/engine/derive";
import { monthStartUtc, monthToDateRange } from "@/lib/engine/period";
import {
  dbFailure,
  describeError,
  type LogDetail,
  logFailure,
  logOk,
  logSkipped,
} from "@/lib/logging/server-log";
import {
  activateProviderConnectionSync,
  deleteUsageDailyFrom,
  findProviderConnectionForSync,
  findTenantStorePerPerson,
  listModelPrices,
  markProviderConnectionSyncError,
  upsertCostDaily,
  upsertUsageDaily,
  type CostDailyUpsert,
  type UsageDailyUpsert,
} from "@/lib/db/admin";
import { collapsePersonGrain } from "@/lib/privacy/minimize";

// On-demand sync for ONE tenant's connection to ONE provider (connect button /
// rotate / sync-now). Provider-agnostic: everything specific lives behind the
// UsageProvider seam. The daily cross-tenant cron arrives with issue #17 and
// reuses this per-tenant unit. Upserts are idempotent by the natural keys, so
// a re-sync never duplicates a bucket.

export type ProviderName = "openai" | "anthropic";

/**
 * Stored in `last_sync_error` and rendered verbatim by the connection card, so
 * it is user-visible copy and therefore pt-BR (F2). A credential no configured
 * key can open (issue #75) is the one sync failure with no automatic recovery —
 * a rotation that retired a key too early, or a row moved between tenants — and
 * the only fix is the Admin pasting the key again.
 */
export const UNREADABLE_CREDENTIAL_MESSAGE =
  "Não foi possível ler a credencial guardada. Reconecte o provedor.";

/**
 * Also rendered verbatim by the connection card, so pt-BR (F2). A malformed
 * keyring is OUR misconfiguration and it hits every tenant at once — telling
 * them all to reconnect would send the whole fleet to re-paste Admin Keys that
 * were never the problem. It says the opposite, on purpose.
 */
export const CREDENTIAL_CONFIG_MESSAGE =
  "Erro de configuração no serviço impediu a leitura da credencial. Não é necessário reconectar; já estamos verificando.";

const SYNC_FAILED_MESSAGE =
  "A sincronização falhou. Tente novamente mais tarde.";

export type SyncResult =
  | { ok: true; usageRows: number; costRows: number; monthUsd: number }
  | { ok: false; error: string };

export async function runProviderSync(
  tenantId: string,
  providerName: ProviderName,
): Promise<SyncResult> {
  // Postgres errors arrive as throws with a `.code`; the old PostgREST path
  // returned `{ error }`. This adapter keeps every dbFailure() log line
  // carrying the same `code` field it always did.
  const codeOf = (cause: unknown): { code?: string | null } => ({
    code: (cause as { code?: unknown } | null)?.code as string | undefined ?? null,
  });

  const [connectionSettled, tenantSettled] = await Promise.allSettled([
    findProviderConnectionForSync(tenantId, providerName),
    findTenantStorePerPerson(tenantId),
  ]);
  if (
    connectionSettled.status === "rejected" ||
    tenantSettled.status === "rejected"
  ) {
    logFailure("provider.sync", tenantId, {
      provider: providerName,
      step: "load_context",
      connectionCode:
        connectionSettled.status === "rejected"
          ? (codeOf(connectionSettled.reason).code ?? null)
          : null,
      tenantCode:
        tenantSettled.status === "rejected"
          ? (codeOf(tenantSettled.reason).code ?? null)
          : null,
    });
    return { ok: false, error: "sync context could not be loaded" };
  }
  const connection = connectionSettled.value;
  // Data minimization (#23): default on if the tenant row is somehow missing.
  const storePerPerson = tenantSettled.value ?? true;
  if (!connection || connection.status === "revoked" || !connection.encrypted_credential) {
    logSkipped("provider.sync", tenantId, { provider: providerName, reason: "no active connection" });
    return { ok: false, error: `no active ${providerName} connection` };
  }

  // Every sync failure already lands on the connection row, where the customer
  // reads it. It lands in the server log too (#79) — `last_sync_error` is
  // overwritten by the next run, so on its own it records the latest failure
  // and no history of them. This EXTENDS that recording rather than replacing
  // it: the row still drives the UI.
  const markError = async (
    message: string,
    detail: LogDetail = {},
  ): Promise<SyncResult> => {
    logFailure("provider.sync", tenantId, {
      provider: providerName,
      reason: message,
      ...detail,
    });
    try {
      await markProviderConnectionSyncError(
        connection.id,
        message,
        new Date().toISOString(),
      );
    } catch (cause) {
      logFailure("provider.sync_state", tenantId, {
        provider: providerName,
        ...dbFailure(codeOf(cause)),
      });
    }
    return { ok: false, error: message };
  };

  // Outside the sync try/catch on purpose: this failure is not a provider
  // failure, it degrades to a reconnect prompt rather than a retryable error,
  // and the cron must count it and move on to the next tenant (issue #75).
  let credential: string;
  try {
    credential = decryptCredential(connection.encrypted_credential, {
      tenantId,
      provider: providerName,
    });
  } catch (cause) {
    if (cause instanceof CredentialKeyringError) {
      // The message a customer sees must not be the key material, nor the
      // variable name — neither is theirs to act on. The cause goes to the
      // server log, where the operator is.
      logFailure("provider.credential", tenantId, {
        provider: providerName,
        ...describeError(cause),
      });
      return markError(CREDENTIAL_CONFIG_MESSAGE);
    }
    return markError(UNREADABLE_CREDENTIAL_MESSAGE);
  }

  try {
    const provider = providerFor(providerName, credential);
    const range = monthToDateRange();
    const monthStart = monthStartUtc();
    // One stamp per sync: every row written by this run carries the same time.
    const syncedAt = new Date().toISOString();

    const [rawUsage, costs, pricesResult] = await Promise.all([
      provider.fetchUsage(range),
      provider.fetchCosts(range),
      listModelPrices().catch((cause) => ({ error: cause })),
    ]);
    if ("error" in pricesResult) {
      return markError(SYNC_FAILED_MESSAGE, {
        step: "price_lookup",
        ...dbFailure(codeOf(pricesResult.error)),
      });
    }
    const prices: ModelPrice[] = pricesResult.map((p) => ({
      provider: p.provider,
      model: p.model,
      inputPricePer1M: p.inputPricePer1M,
      outputPricePer1M: p.outputPricePer1M,
      effectiveDate: p.effectiveDate,
    }));

    // "Store per-person data" off → collapse to team/project grain before any
    // person-grain row is derived or persisted (aggregates stay exact).
    const usage = storePerPerson ? rawUsage : collapsePersonGrain(rawUsage);

    const usageRows: UsageDailyUpsert[] = usage.map((bucket) => {
      const derived = deriveCost(
        { provider: providerName, model: bucket.model, date: bucket.date, inputTokens: bucket.inputTokens, outputTokens: bucket.outputTokens },
        prices,
      );
      return {
        tenant_id: tenantId,
        date: bucket.date,
        provider: providerName,
        project_id: bucket.projectId ?? null,
        api_key_id: bucket.apiKeyId ?? null,
        user_id: bucket.userId ?? null,
        model: bucket.model,
        input_tokens: bucket.inputTokens,
        output_tokens: bucket.outputTokens,
        derived_cost: derived.cost,
        uncosted: derived.uncosted,
        synced_at: syncedAt,
      };
    });

    const costRows: CostDailyUpsert[] = costs.map((bucket) => ({
      tenant_id: tenantId,
      date: bucket.date,
      provider: providerName,
      project_id: bucket.projectId ?? null,
      line_item: bucket.lineItem,
      amount: bucket.amount,
      currency: bucket.currency,
      synced_at: syncedAt,
    }));

    // Usage is fetched month-to-date, so replace the current provider/month
    // slice before inserting. This prevents stale person-grain rows from
    // surviving after store_per_person is turned off, and prevents stale shared
    // rows from double-counting if it is turned back on.
    try {
      await deleteUsageDailyFrom(tenantId, providerName, monthStart);
    } catch (cause) {
      return markError(SYNC_FAILED_MESSAGE, {
        step: "usage_cleanup",
        ...dbFailure(codeOf(cause)),
      });
    }

    // Independent tables — after usage cleanup, the two upserts run in parallel.
    // allSettled keeps the original check order (usage first, then cost) even
    // when both fail at once.
    const [usageOutcome, costOutcome] = await Promise.allSettled([
      upsertUsageDaily(usageRows),
      upsertCostDaily(costRows),
    ]);
    if (usageOutcome.status === "rejected") {
      return markError(SYNC_FAILED_MESSAGE, {
        step: "usage_upsert",
        ...dbFailure(codeOf(usageOutcome.reason)),
      });
    }
    if (costOutcome.status === "rejected") {
      return markError(SYNC_FAILED_MESSAGE, {
        step: "cost_upsert",
        ...dbFailure(codeOf(costOutcome.reason)),
      });
    }

    try {
      await activateProviderConnectionSync(connection.id, syncedAt);
    } catch (cause) {
      return markError(SYNC_FAILED_MESSAGE, {
        step: "connection_state",
        ...dbFailure(codeOf(cause)),
      });
    }

    const monthUsd = costs.reduce((sum, c) => sum + c.amount, 0);
    logOk("provider.sync", tenantId, {
      provider: providerName,
      usageRows: usageRows.length,
      costRows: costRows.length,
    });
    return { ok: true, usageRows: usageRows.length, costRows: costRows.length, monthUsd };
  } catch (cause) {
    // Never leak the key or raw payloads into errors shown/logged.
    return markError(SYNC_FAILED_MESSAGE, {
      step: "provider_request",
      ...describeError(cause),
    });
  }
}
