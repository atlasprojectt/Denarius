"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/session";
import { isUndefinedColumn } from "@/lib/db/schema-drift";
import { dbFailure, logFailure } from "@/lib/logging/server-log";
import { createAdminClient } from "@/lib/supabase/admin";

import { WELCOME_PARAM } from "./steps";

export type FinishSetupState = { error?: string };

/**
 * Closes the guided setup and sends the Admin to the cockpit. Finishing and
 * skipping the last step are the same decision: steps are derived from data,
 * so whatever was skipped stays visibly pending in Ajustes. Only the first
 * completion earns the welcome dialog; revisiting the setup later just
 * returns home.
 */
export async function finishSetup(
  _prev: FinishSetupState,
): Promise<FinishSetupState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };
  const { tenantId } = auth.session;

  const { data, error } = await createAdminClient()
    .from("tenant")
    .update({ setup_completed_at: new Date().toISOString() })
    .eq("id", tenantId)
    .is("setup_completed_at", null)
    .select("id");

  // Before the migration lands nobody is gated, so a missing column is not a
  // failure to report — the Admin still finished and deserves the welcome.
  if (error && !isUndefinedColumn(error)) {
    logFailure("setup.finish", tenantId, dbFailure(error));
    return { error: "Não foi possível concluir a configuração. Tente novamente." };
  }

  const firstCompletion = error !== null || (data ?? []).length > 0;
  revalidatePath("/", "layout");
  redirect(firstCompletion ? `/?${WELCOME_PARAM}=1` : "/");
}
