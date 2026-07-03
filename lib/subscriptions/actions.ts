"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  subscriptionSchema,
  subscriptionUpdateSchema,
} from "@/lib/validation";

export type SubscriptionFormState = { error?: string; success?: string };

/** An empty team select ("") means shared/company-wide → stored as null. */
function readTeamId(formData: FormData): string | null {
  const raw = formData.get("teamId");
  const value = typeof raw === "string" ? raw.trim() : "";
  return value === "" ? null : value;
}

/** A team must belong to this tenant and not be the internal Unattributed bucket. */
async function isOwnedTeam(
  admin: SupabaseClient,
  tenantId: string,
  teamId: string | null,
): Promise<boolean> {
  if (teamId === null) return true; // shared/company-wide
  const { data } = await admin
    .from("team")
    .select("id, is_unattributed")
    .eq("id", teamId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const team = data as { is_unattributed: boolean } | null;
  return Boolean(team) && !team!.is_unattributed;
}

export async function createSubscription(
  _prev: SubscriptionFormState,
  formData: FormData,
): Promise<SubscriptionFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = subscriptionSchema.safeParse({
    tool: formData.get("tool"),
    seatCount: formData.get("seatCount"),
    unitPrice: formData.get("unitPrice"),
    teamId: readTeamId(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { tenantId } = auth.session;
  const admin = createAdminClient();

  if (!(await isOwnedTeam(admin, tenantId, parsed.data.teamId))) {
    return { error: "Escolha um time válido." };
  }

  // Store the amount in the tenant's display currency (day-zero, pre-connectors).
  const { data: tenant } = await admin
    .from("tenant")
    .select("display_currency")
    .eq("id", tenantId)
    .maybeSingle();
  const currency =
    (tenant as { display_currency: string } | null)?.display_currency ?? "BRL";

  const { error } = await admin.from("subscription").insert({
    tenant_id: tenantId,
    tool: parsed.data.tool,
    seat_count: parsed.data.seatCount,
    unit_price: parsed.data.unitPrice,
    currency,
    team_id: parsed.data.teamId,
  });
  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath("/ajustes/assinaturas");
  revalidatePath("/ajustes");
  revalidatePath("/explorar");
  return { success: "Assinatura adicionada." };
}

export async function updateSubscription(
  _prev: SubscriptionFormState,
  formData: FormData,
): Promise<SubscriptionFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = subscriptionUpdateSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
    tool: formData.get("tool"),
    seatCount: formData.get("seatCount"),
    unitPrice: formData.get("unitPrice"),
    teamId: readTeamId(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { tenantId } = auth.session;
  const admin = createAdminClient();

  if (!(await isOwnedTeam(admin, tenantId, parsed.data.teamId))) {
    return { error: "Escolha um time válido." };
  }

  const { error, count } = await admin
    .from("subscription")
    .update(
      {
        tool: parsed.data.tool,
        seat_count: parsed.data.seatCount,
        unit_price: parsed.data.unitPrice,
        team_id: parsed.data.teamId,
        updated_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.subscriptionId)
    .eq("tenant_id", tenantId);
  if (error || count === 0) {
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/ajustes/assinaturas");
  revalidatePath("/ajustes");
  revalidatePath("/explorar");
  return { success: "Assinatura atualizada." };
}

export async function deleteSubscription(
  _prev: SubscriptionFormState,
  formData: FormData,
): Promise<SubscriptionFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const subscriptionId = formData.get("subscriptionId");
  if (typeof subscriptionId !== "string" || subscriptionId === "") {
    return { error: "Assinatura inválida." };
  }

  const { tenantId } = auth.session;
  const admin = createAdminClient();

  const { error, count } = await admin
    .from("subscription")
    .delete({ count: "exact" })
    .eq("id", subscriptionId)
    .eq("tenant_id", tenantId);
  if (error || count === 0) {
    return { error: "Não foi possível remover. Tente novamente." };
  }

  revalidatePath("/ajustes/assinaturas");
  revalidatePath("/ajustes");
  revalidatePath("/explorar");
  return { success: "Assinatura removida." };
}
