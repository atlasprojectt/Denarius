"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import { providerFor } from "@/lib/connectors";
import { encryptCredential } from "@/lib/crypto";
import { money } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { runOpenAISync } from "@/lib/sync/openai-sync";
import { openAiKeySchema } from "@/lib/validation";

export type ConnectionFormState = { error?: string; success?: string };

const copy = {
  invalidKey:
    "A OpenAI recusou esta chave. Confira se é uma Admin Key da organização (somente leitura).",
  network: "Não foi possível falar com a OpenAI agora. Tente novamente.",
  saveFailed: "Não foi possível salvar a conexão. Tente novamente.",
  syncFailed:
    "Chave salva, mas a primeira sincronização falhou — use “Sincronizar agora” para tentar de novo.",
  connected: (total: string) =>
    `Conectado. Encontramos ${total} de uso neste mês.`,
  synced: (total: string) => `Sincronizado — ${total} neste mês.`,
  revoked: "Conexão revogada. A chave foi descartada.",
  revokeFailed: "Não foi possível revogar. Tente novamente.",
  noConnection: "Nenhuma conexão ativa com a OpenAI.",
};

function revalidateConsumers(): void {
  revalidatePath("/ajustes/conexoes");
  revalidatePath("/ajustes");
  revalidatePath("/explorar");
  revalidatePath("/");
}

/** Save-or-rotate: upserting the (tenant, provider) row IS the rotation. */
export async function saveOpenAIKey(
  _prev: ConnectionFormState,
  formData: FormData,
): Promise<ConnectionFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = openAiKeySchema.safeParse({
    adminKey: formData.get("adminKey"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const adminKey = parsed.data.adminKey;

  // Test BEFORE storing anything — a bad key never lands in the database.
  const test = await providerFor("openai", adminKey).testConnection();
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
      provider: "openai",
      encrypted_credential: encryptCredential(adminKey),
      status: "active",
      last_sync_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,provider" },
  );
  if (error) return { error: copy.saveFailed };

  // The first "we found $X this month" moment — sync immediately, not in 24h.
  const sync = await runOpenAISync(tenantId);
  revalidateConsumers();
  if (!sync.ok) return { error: copy.syncFailed };
  return { success: copy.connected(money(sync.monthUsd, "USD")) };
}

export async function syncOpenAINow(
  _prev: ConnectionFormState,
  _formData: FormData,
): Promise<ConnectionFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const sync = await runOpenAISync(auth.session.tenantId);
  revalidateConsumers();
  if (!sync.ok) return { error: copy.syncFailed };
  return { success: copy.synced(money(sync.monthUsd, "USD")) };
}

export async function revokeOpenAIKey(
  _prev: ConnectionFormState,
  _formData: FormData,
): Promise<ConnectionFormState> {
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
    .eq("provider", "openai");
  if (error) return { error: copy.revokeFailed };
  if (count === 0) return { error: copy.noConnection };

  revalidateConsumers();
  return { success: copy.revoked };
}
