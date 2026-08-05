"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnedTeam } from "@/lib/teams/queries";
import {
  fieldErrorsOf,
  subscriptionDeleteSchema,
  subscriptionSchema,
  subscriptionUpdateSchema,
} from "@/lib/validation";

export type SubscriptionFormState = {
  error?: string;
  success?: string;
  /** Field-name → message, for the unified inline validation (S2/QA-06). */
  fieldErrors?: Record<string, string>;
};

/** An empty team select ("") means shared/company-wide → stored as null. */
function readTeamId(formData: FormData): string | null {
  const raw = formData.get("teamId");
  const value = typeof raw === "string" ? raw.trim() : "";
  return value === "" ? null : value;
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
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const { tenantId } = auth.session;
  const admin = createAdminClient();

  // Independent reads → parallel. Amount is stored in the tenant's display
  // currency (day-zero, pre-connectors).
  const [ownedTeam, { data: tenant }] = await Promise.all([
    isOwnedTeam(admin, tenantId, parsed.data.teamId),
    admin
      .from("tenant")
      .select("display_currency")
      .eq("id", tenantId)
      .maybeSingle(),
  ]);
  if (!ownedTeam) return { error: "Escolha um time válido." };
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

  await recordAudit(auth.session, "subscription.created", {
    target: parsed.data.tool,
    detail: {
      seatCount: parsed.data.seatCount,
      unitPrice: parsed.data.unitPrice,
      currency,
      teamId: parsed.data.teamId,
    },
  });

  // Seats feed the Home cockpit, Explore and team detail — whole-tree
  // invalidation (QA-02 rule, see lib/providers/actions.ts). The old list
  // missed "/" entirely, so a new subscription never updated the verdict.
  revalidatePath("/", "layout");
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
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

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

  await recordAudit(auth.session, "subscription.updated", {
    target: parsed.data.tool,
    detail: {
      seatCount: parsed.data.seatCount,
      unitPrice: parsed.data.unitPrice,
      teamId: parsed.data.teamId,
    },
  });

  revalidatePath("/", "layout");
  return { success: "Assinatura atualizada." };
}

export async function deleteSubscription(
  _prev: SubscriptionFormState,
  formData: FormData,
): Promise<SubscriptionFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = subscriptionDeleteSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { tenantId } = auth.session;
  const admin = createAdminClient();

  // The deleted row comes back with the delete — the audit entry needs to name
  // the tool, and a pre-read would cost a round trip for it (#73).
  const { data: removed, error, count } = await admin
    .from("subscription")
    .delete({ count: "exact" })
    .eq("id", parsed.data.subscriptionId)
    .eq("tenant_id", tenantId)
    .select("tool, seat_count, unit_price");
  if (error) return { error: "Não foi possível remover. Tente novamente." };
  // Idempotent: a repeated submit (or a cross-tenant id, filtered out by the
  // tenant scope above) matches nothing — the desired end state already holds,
  // so this is not an error (QA-05 destructive-action contract).
  if (count === 0) return { success: "Assinatura já havia sido removida." };

  const deleted = ((removed ?? []) as {
    tool: string;
    seat_count: number;
    unit_price: number;
  }[])[0];
  if (deleted) {
    await recordAudit(auth.session, "subscription.deleted", {
      target: deleted.tool,
      detail: { seatCount: deleted.seat_count, unitPrice: deleted.unit_price },
    });
  }

  revalidatePath("/", "layout");
  return { success: "Assinatura removida." };
}
