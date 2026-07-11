"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import {
  parseRosterCsv,
  type RosterRowError,
} from "@/lib/roster/parse-csv";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isOwnedTeam } from "@/lib/teams/queries";
import {
  employeeDeleteSchema,
  employeeUpdateSchema,
  fieldErrorsOf,
} from "@/lib/validation";

const MAX_FILE_BYTES = 512 * 1024;

export type RosterPreview = {
  validCount: number;
  newTeams: string[];
  errors: RosterRowError[];
};

export type RosterFormState = {
  error?: string;
  success?: string;
  /** Field-name → message, for the unified inline validation (S2/QA-06). */
  fieldErrors?: Record<string, string>;
  preview?: RosterPreview;
};

export async function importRoster(
  _prev: RosterFormState,
  formData: FormData,
): Promise<RosterFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Escolha um arquivo CSV." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "Arquivo muito grande (máximo 512 KB)." };
  }

  const { rows, errors } = parseRosterCsv(await file.text());
  const intent = formData.get("intent");

  const supabase = await createClient();

  if (intent === "preview" || errors.length > 0) {
    // Nothing is written on preview — and never on a file with errors
    // (no partial imports, ever).
    const { data: existingTeams } = await supabase.from("team").select("name");
    const existing = new Set(
      (existingTeams ?? []).map((t: { name: string }) => t.name),
    );
    const newTeams = [...new Set(rows.map((r) => r.team))].filter(
      (team) => !existing.has(team),
    );
    return { preview: { validCount: rows.length, newTeams, errors } };
  }

  // Commit: atomic import via the security-definer RPC — the function derives
  // the tenant from the session and enforces the admin role again (defense in
  // depth); a mid-import failure rolls the whole transaction back.
  const { data, error } = await supabase.rpc("roster_import", { rows });
  if (error) {
    return { error: "A importação falhou — nada foi gravado. Tente novamente." };
  }

  const result = data as { imported: number; teams_created: number };
  // Roster feeds the seats-vs-roster observations on Home and creates teams —
  // whole-tree invalidation (QA-02 rule, see lib/providers/actions.ts).
  revalidatePath("/", "layout");
  return {
    success: `${result.imported} pessoa(s) importada(s), ${result.teams_created} time(s) criado(s).`,
  };
}

export async function updateEmployee(
  _prev: RosterFormState,
  formData: FormData,
): Promise<RosterFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = employeeUpdateSchema.safeParse({
    employeeId: formData.get("employeeId"),
    name: formData.get("name"),
    email: formData.get("email"),
    teamId: formData.get("teamId"),
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
    .from("employee")
    .update(
      {
        name: parsed.data.name,
        email: parsed.data.email,
        team_id: parsed.data.teamId,
        updated_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.employeeId)
    .eq("tenant_id", tenantId);
  if (error) {
    // 23505 = unique (tenant_id, email): the import identity key (UX-14).
    if (error.code === "23505") {
      return {
        error: "Já existe uma pessoa com este e-mail no roster.",
        fieldErrors: { email: "Já existe uma pessoa com este e-mail." },
      };
    }
    return { error: "Não foi possível salvar. Tente novamente." };
  }
  if (count === 0) return { error: "Pessoa não encontrada." };

  revalidatePath("/", "layout");
  return { success: "Funcionário atualizado." };
}

/**
 * Removes one person from the roster (2026-07-11 audit, UX-14). Historical
 * API usage is attributed by provider project/workspace via project_map — it
 * never referenced the employee row — so past spend stays exactly where it
 * was; only the roster headcount (seats-vs-roster observations) changes.
 */
export async function removeEmployee(
  _prev: RosterFormState,
  formData: FormData,
): Promise<RosterFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = employeeDeleteSchema.safeParse({
    employeeId: formData.get("employeeId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = createAdminClient();
  const { error, count } = await admin
    .from("employee")
    .delete({ count: "exact" })
    .eq("id", parsed.data.employeeId)
    .eq("tenant_id", auth.session.tenantId);
  if (error) return { error: "Não foi possível remover. Tente novamente." };
  // Idempotent: repeated submit / cross-tenant id match nothing — the desired
  // end state already holds (QA-05 destructive-action contract).
  if (count === 0) return { success: "Pessoa já havia sido removida." };

  revalidatePath("/", "layout");
  return { success: "Pessoa removida do roster." };
}
