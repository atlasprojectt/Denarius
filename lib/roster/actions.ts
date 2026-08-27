"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/session";
import {
  parseRosterCsv,
  type RosterRowError,
} from "@/lib/roster/parse-csv";
import { dbFailure, logFailure } from "@/lib/logging/server-log";
import {
  deleteEmployeeReturning,
  isOwnedTeam,
  updateEmployeeById,
} from "@/lib/db/admin";
import { createClient } from "@/lib/supabase/server";
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
    const { data: existingTeams, error: teamsError } = await supabase
      .from("team")
      .select("name");
    if (teamsError) {
      logFailure("roster.preview", auth.session.tenantId, dbFailure(teamsError));
      return { error: "Não foi possível preparar a prévia. Tente novamente." };
    }
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
    logFailure("roster.import", auth.session.tenantId, dbFailure(error));
    return { error: "A importação falhou — nada foi gravado. Tente novamente." };
  }

  const result = data as { imported: number; teams_created: number };
  // Counts only: the roster itself is the people, and the trail records that an
  // import happened and how big it was, never who is in the file (#73).
  await recordAudit(auth.session, "roster.imported", {
    detail: { imported: result.imported, teamsCreated: result.teams_created },
  });
  // Roster feeds the seats-vs-roster finding rules and creates teams —
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

  if (!(await isOwnedTeam(tenantId, parsed.data.teamId))) {
    return { error: "Escolha um time válido." };
  }

  let matched: number;
  try {
    matched = await updateEmployeeById(
      parsed.data.employeeId,
      tenantId,
      {
        name: parsed.data.name,
        email: parsed.data.email,
        team_id: parsed.data.teamId,
        updated_at: new Date().toISOString(),
      },
    );
  } catch (cause) {
    // 23505 = unique (tenant_id, email): the import identity key (UX-14).
    if ((cause as { code?: unknown } | null)?.code === "23505") {
      return {
        error: "Já existe uma pessoa com este e-mail no roster.",
        fieldErrors: { email: "Já existe uma pessoa com este e-mail." },
      };
    }
    logFailure("roster.employee_update", tenantId, dbFailure({
      code: ((cause as { code?: unknown } | null)?.code as string | undefined) ?? null,
    }));
    return { error: "Não foi possível salvar. Tente novamente." };
  }
  if (matched === 0) return { error: "Pessoa não encontrada." };

  await recordAudit(auth.session, "roster.employee_updated", {
    target: parsed.data.email,
    detail: { teamId: parsed.data.teamId },
  });

  revalidatePath("/", "layout");
  return { success: "Funcionário atualizado." };
}

/**
 * Removes one person from the roster (2026-07-11 audit, UX-14). Historical
 * API usage is attributed by provider project/workspace via project_map — it
 * never referenced the employee row — so past spend stays exactly where it
 * was; only the roster headcount used by seats-vs-roster findings changes.
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

  // The deleted row comes back with the delete, so the trail can name who was
  // removed without a pre-read (#73).
  let outcome: { count: number; row: { email: string } | null };
  try {
    outcome = await deleteEmployeeReturning(
      parsed.data.employeeId,
      auth.session.tenantId,
    );
  } catch (cause) {
    logFailure("roster.employee_remove", auth.session.tenantId, dbFailure({
      code: ((cause as { code?: unknown } | null)?.code as string | undefined) ?? null,
    }));
    return { error: "Não foi possível remover. Tente novamente." };
  }
  // Idempotent: repeated submit / cross-tenant id match nothing — the desired
  // end state already holds (QA-05 destructive-action contract).
  if (outcome.count === 0) return { success: "Pessoa já havia sido removida." };

  const deleted = outcome.row;
  await recordAudit(auth.session, "roster.employee_removed", {
    target: deleted?.email ?? parsed.data.employeeId,
  });

  revalidatePath("/", "layout");
  return { success: "Pessoa removida do roster." };
}
