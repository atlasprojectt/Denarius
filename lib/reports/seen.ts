// Browser-only memory of which closed reports were already opened ("yyyy-mm"
// paths). Findings stay stateless on the server (invariant #6); this is the
// same local-only "seen" pattern the notification center uses — per browser,
// no migration, no RLS surface. Only the newest closed month can be "new".

export const REPORTS_SEEN_KEY = "denarius:reports:seen";

/** Same-tab signal so the sidebar badge clears without a reload. */
export const REPORTS_SEEN_EVENT = "denarius:reports:seen";

/** Single slot for the on-demand file: only its generation stamp is kept —
 *  the document itself is always read live on open, never stored. */
export const AGORA_FILE_KEY = "denarius:reports:agora-file";

export function parseSeenPeriods(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function serializeSeenPeriods(periods: Iterable<string>): string {
  return JSON.stringify([...periods]);
}

/** Null when there is nothing new: no snapshot, or the newest is seen. */
export function newestUnseenPeriod(
  latestPeriodPath: string | null,
  seen: ReadonlySet<string> | readonly string[],
): string | null {
  if (latestPeriodPath === null) return null;
  const seenSet = seen instanceof Set ? seen : new Set(seen);
  return seenSet.has(latestPeriodPath) ? null : latestPeriodPath;
}
