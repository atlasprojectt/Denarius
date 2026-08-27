"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/session";
import {
  clearProjectMapping,
  isOwnedTeam,
  upsertProjectMap,
  type ProjectMapUpsert,
} from "@/lib/db/admin";
import { dbFailure, logFailure } from "@/lib/logging/server-log";
import { projectMapEntrySchema } from "@/lib/validation";

export type ProjectMapFormState = {
  error?: string;
  success?: string;
  /** What the server actually persisted, keyed like the form rows — the
   *  client's new baseline (QA-11: the confirmed result, not stale props). */
  saved?: { key: string; teamId: string | null }[];
};

// The form carries one hidden `project` field per row (value "provider|projectId")
// plus a matching `team|provider|projectId` select. `|` never appears in an
// OpenAI project_id (proj_…) or an Anthropic workspace_id (uuid), so it is a
// safe separator.
function splitKey(value: string): { provider: string; projectId: string } | null {
  const sep = value.indexOf("|");
  if (sep <= 0 || sep === value.length - 1) return null;
  return { provider: value.slice(0, sep), projectId: value.slice(sep + 1) };
}

/**
 * Bulk-saves the project→team mapping in one round-trip. Each row is either
 * pinned to a team (upsert) or cleared (delete → falls back to Unattributed).
 * Admin-guarded; team ownership is verified per row so a mapping can never
 * point at another tenant's team or the internal Unattributed bucket.
 */
export async function saveProjectMap(
  _prev: ProjectMapFormState,
  formData: FormData,
): Promise<ProjectMapFormState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };
  const { tenantId } = auth.session;

  // Postgres errors arrive as throws with a `.code`; this keeps the dbFailure()
  // log lines carrying the same `code` field the PostgREST path logged.
  const codeOf = (cause: unknown): { code?: string | null } => ({
    code: ((cause as { code?: unknown } | null)?.code as string | undefined) ?? null,
  });

  // De-duplicate: the responsive form renders each row twice (mobile cards +
  // desktop table), so every field arrives in duplicate — and a duplicated
  // upsert row would make Postgres fail the whole batch ("cannot affect row a
  // second time"). Last occurrence wins; values agree anyway (one shared draft).
  const rows = [...new Set(formData.getAll("project").map((v) => String(v)))];
  const toUpsert: ProjectMapUpsert[] = [];
  const toClear: { provider: string; projectId: string }[] = [];
  const saved: { key: string; teamId: string | null }[] = [];
  const now = new Date().toISOString();

  for (const row of rows) {
    const key = splitKey(row);
    if (!key) return { error: "Entrada de mapeamento inválida." };
    const rawTeam = formData.get(`team|${row}`);
    const teamId = typeof rawTeam === "string" && rawTeam.trim() !== "" ? rawTeam.trim() : null;

    const parsed = projectMapEntrySchema.safeParse({
      provider: key.provider,
      projectId: key.projectId,
      teamId,
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    saved.push({ key: row, teamId: parsed.data.teamId });
    if (parsed.data.teamId === null) {
      toClear.push({ provider: parsed.data.provider, projectId: parsed.data.projectId });
    } else {
      if (!(await isOwnedTeam(tenantId, parsed.data.teamId))) {
        return { error: "Escolha um time válido." };
      }
      toUpsert.push({
        tenant_id: tenantId,
        provider: parsed.data.provider,
        project_id: parsed.data.projectId,
        team_id: parsed.data.teamId,
        updated_at: now,
      });
    }
  }

  if (toUpsert.length > 0) {
    try {
      await upsertProjectMap(toUpsert);
    } catch (cause) {
      logFailure("attribution.save", tenantId, { step: "upsert", ...dbFailure(codeOf(cause)) });
      return { error: "Não foi possível salvar o mapeamento. Tente novamente." };
    }
  }
  for (const c of toClear) {
    try {
      await clearProjectMapping(tenantId, c.provider, c.projectId);
    } catch (cause) {
      logFailure("attribution.save", tenantId, { step: "clear", ...dbFailure(codeOf(cause)) });
      return { error: "Não foi possível salvar o mapeamento. Tente novamente." };
    }
  }

  // Attribution moves spend between teams, so what changed is how many
  // projects are pinned and how many fell back to Unattributed (#73).
  await recordAudit(auth.session, "attribution.updated", {
    detail: { pinned: toUpsert.length, cleared: toClear.length },
  });

  // Attribution moves spend between teams on Home, Explore and every team
  // detail page — invalidate the whole tree so no route shows the old split
  // (QA-02 rule, see lib/providers/actions.ts).
  revalidatePath("/", "layout");
  return { success: "Mapeamento salvo.", saved };
}
