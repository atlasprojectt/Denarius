// Attribution mapping draft state (pure, client-safe — no I/O). WP4 of the
// 2026-07-11 audit plan (QA-11/UX-16): the selects are CONTROLLED by a local
// draft measured against a baseline; the baseline only ever advances to what
// the server CONFIRMED it saved, so a route revalidation racing the save can
// never repaint the old value over a confirmed selection.

/** "provider|projectId" → teamId; "" = Não atribuído (the select sentinel). */
export type MappingDraft = Record<string, string>;

export const UNATTRIBUTED = "";

/** The one row key, shared with the server action's FormData field names. */
export function rowKey(provider: string, projectId: string): string {
  return `${provider}|${projectId}`;
}

/** Initial draft/baseline from the server-rendered rows. */
export function draftFromRows(
  rows: { provider: string; projectId: string; teamId: string | null }[],
): MappingDraft {
  const draft: MappingDraft = {};
  for (const row of rows) {
    draft[rowKey(row.provider, row.projectId)] = row.teamId ?? UNATTRIBUTED;
  }
  return draft;
}

/** True when at least one selection differs from the baseline — gates Save. */
export function isDirty(draft: MappingDraft, baseline: MappingDraft): boolean {
  const keys = new Set([...Object.keys(draft), ...Object.keys(baseline)]);
  for (const key of keys) {
    if ((draft[key] ?? UNATTRIBUTED) !== (baseline[key] ?? UNATTRIBUTED)) {
      return true;
    }
  }
  return false;
}

/** The confirmed server result as the new baseline (action success payload). */
export function baselineFromSaved(
  saved: { key: string; teamId: string | null }[],
): MappingDraft {
  const baseline: MappingDraft = {};
  for (const entry of saved) baseline[entry.key] = entry.teamId ?? UNATTRIBUTED;
  return baseline;
}

/**
 * Folds a fresh server snapshot into existing client state WITHOUT touching
 * keys the client already tracks: rows that appear for the first time (e.g. a
 * sync surfaced a new project) adopt the server value; everything else keeps
 * the client's truth. This is what makes revalidation unable to restore stale
 * props over a confirmed or in-progress selection (QA-11).
 */
export function adoptServerRows(
  current: MappingDraft,
  server: MappingDraft,
): MappingDraft {
  return { ...server, ...current };
}
