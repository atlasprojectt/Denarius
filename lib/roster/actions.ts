"use server";

import { revalidatePath } from "next/cache";

import {
  parseRosterCsv,
  type RosterRowError,
} from "@/lib/roster/parse-csv";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { employeeUpdateSchema } from "@/lib/validation";

const MAX_FILE_BYTES = 512 * 1024;

export type RosterPreview = {
  validCount: number;
  newTeams: string[];
  errors: RosterRowError[];
};

export type RosterFormState = {
  error?: string;
  success?: string;
  preview?: RosterPreview;
};

type Session = { userId: string; tenantId: string; role: string };

async function requireAdmin(): Promise<
  | { session: Session; error?: undefined }
  | { session?: undefined; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const { data } = await supabase
    .from("app_user")
    .select("tenant_id, role")
    .eq("id", user.id)
    .maybeSingle();
  const row = data as { tenant_id: string; role: string } | null;
  if (!row) return { error: "Cadastro incompleto — conclua o onboarding." };
  if (row.role !== "admin") {
    return { error: "Somente administradores podem gerenciar o roster." };
  }
  return {
    session: { userId: user.id, tenantId: row.tenant_id, role: row.role },
  };
}

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
  revalidatePath("/ajustes/roster");
  revalidatePath("/ajustes");
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
    teamId: formData.get("teamId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { tenantId } = auth.session;
  const admin = createAdminClient();

  // The team must belong to this tenant and not be the internal bucket.
  const { data: team } = await admin
    .from("team")
    .select("id, is_unattributed")
    .eq("id", parsed.data.teamId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!team || (team as { is_unattributed: boolean }).is_unattributed) {
    return { error: "Escolha um time válido." };
  }

  const { error, count } = await admin
    .from("employee")
    .update(
      {
        name: parsed.data.name,
        team_id: parsed.data.teamId,
        updated_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.employeeId)
    .eq("tenant_id", tenantId);
  if (error || count === 0) {
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/ajustes/roster");
  return { success: "Funcionário atualizado." };
}
