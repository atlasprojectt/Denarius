"use server";

import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { providerFor } from "@/lib/connectors";
import { encryptCredential } from "@/lib/crypto";
import { money } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { runProviderSync, type ProviderName } from "@/lib/sync/provider-sync";
import { anthropicKeySchema, openAiKeySchema } from "@/lib/validation";

export type ConnectionFormState = { error?: string; success?: string };

// Provider-specific copy (pt-BR); the lifecycle logic below is shared.
const copyFor = (label: string) => ({
  invalidKey: `A ${label} recusou esta chave. Confira se é uma Admin Key da organização (somente leitura).`,
  network: `Não foi possível falar com a ${label} agora. Tente novamente.`,
  saveFailed: "Não foi possível salvar a conexão. Tente novamente.",
  syncFailed:
    "Chave salva, mas a primeira sincronização falhou — use “Sincronizar agora” para tentar de novo.",
  syncNowFailed:
    "A sincronização falhou — veja o status da conexão e tente de novo.",
  connected: (total: string) =>
    `Conectado. Encontramos ${total} de uso neste mês.`,
  synced: (total: string) => `Sincronizado — ${total} neste mês.`,
  revoked: "Conexão revogada. A chave foi descartada.",
  revokeFailed: "Não foi possível revogar. Tente novamente.",
  noConnection: `Nenhuma conexão ativa com a ${label}.`,
});

const providers: Record<
  ProviderName,
  { label: string; keySchema: ZodType<{ adminKey: string }> }
> = {
  openai: { label: "OpenAI", keySchema: openAiKeySchema },
  anthropic: { label: "Anthropic", keySchema: anthropicKeySchema },
};

// QA-02 (2026-07-11 audit): a sync/revoke changes connection status, cost and
// usage data consumed by Home, Explore, EVERY team-detail page, Attribution
// and the Ajustes hub. Enumerating paths missed the dynamic ones and let a
// stale banner survive navigation, so spend-affecting mutations invalidate the
// whole layout tree — one rule, no route left contradicting another.
function revalidateConsumers(): void {
  revalidatePath("/", "layout");
}

/** Save-or-rotate: upserting the (tenant, provider) row IS the rotation. */
async function saveKey(
  providerName: ProviderName,
  formData: FormData,
): Promise<ConnectionFormState> {
  const { label, keySchema } = providers[providerName];
  const copy = copyFor(label);

  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = keySchema.safeParse({ adminKey: formData.get("adminKey") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const adminKey = parsed.data.adminKey;

  // Test BEFORE storing anything — a bad key never lands in the database.
  const test = await providerFor(providerName, adminKey).testConnection();
  if (!test.ok) {
    return {
      error: test.reason === "invalid_key" ? copy.invalidKey : copy.network,
    };
  }

  const { tenantId } = auth.session;
  const admin = createAdminClient();
  const { error } = await admin.from("provider_connection").upsert(
    {
      tenant_id: tenantId,
      provider: providerName,
      // Bound to the row it is stored in (#75): a blob moved to another
      // tenant's or another provider's row fails to decrypt.
      encrypted_credential: encryptCredential(adminKey, {
        tenantId,
        provider: providerName,
      }),
      status: "active",
      last_sync_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,provider" },
  );
  if (error) return { error: copy.saveFailed };

  // The first "we found $X this month" moment — sync immediately, not in 24h.
  const sync = await runProviderSync(tenantId, providerName);
  revalidateConsumers();
  if (!sync.ok) return { error: copy.syncFailed };
  return { success: copy.connected(money(sync.monthUsd, "USD")) };
}

async function syncNow(providerName: ProviderName): Promise<ConnectionFormState> {
  const copy = copyFor(providers[providerName].label);

  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const sync = await runProviderSync(auth.session.tenantId, providerName);
  revalidateConsumers();
  if (!sync.ok) return { error: copy.syncNowFailed };
  return { success: copy.synced(money(sync.monthUsd, "USD")) };
}

async function revokeKey(
  providerName: ProviderName,
): Promise<ConnectionFormState> {
  const copy = copyFor(providers[providerName].label);

  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const admin = createAdminClient();
  const { error, count } = await admin
    .from("provider_connection")
    .update(
      {
        status: "revoked",
        encrypted_credential: null, // the ciphertext is discarded, not kept
        updated_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("tenant_id", auth.session.tenantId)
    .eq("provider", providerName);
  if (error) return { error: copy.revokeFailed };
  if (count === 0) return { error: copy.noConnection };

  revalidateConsumers();
  return { success: copy.revoked };
}

// Server actions must be statically exported async functions — one thin
// wrapper per (provider, operation) over the shared lifecycle above.

export async function saveOpenAIKey(
  _prev: ConnectionFormState,
  formData: FormData,
): Promise<ConnectionFormState> {
  return saveKey("openai", formData);
}

export async function syncOpenAINow(
  _prev: ConnectionFormState,
  _formData: FormData,
): Promise<ConnectionFormState> {
  return syncNow("openai");
}

export async function revokeOpenAIKey(
  _prev: ConnectionFormState,
  _formData: FormData,
): Promise<ConnectionFormState> {
  return revokeKey("openai");
}

export async function saveAnthropicKey(
  _prev: ConnectionFormState,
  formData: FormData,
): Promise<ConnectionFormState> {
  return saveKey("anthropic", formData);
}

export async function syncAnthropicNow(
  _prev: ConnectionFormState,
  _formData: FormData,
): Promise<ConnectionFormState> {
  return syncNow("anthropic");
}

export async function revokeAnthropicKey(
  _prev: ConnectionFormState,
  _formData: FormData,
): Promise<ConnectionFormState> {
  return revokeKey("anthropic");
}
