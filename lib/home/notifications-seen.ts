// Browser-only memory of which budget notifications were already opened.
// Findings stay stateless on the server (invariant #6); this is the same
// local-only "seen" pattern as closed reports — per browser, no migration,
// no RLS surface. The header badge counts only unseen active alerts, so
// opening the panel reads as "lido" while the panel itself keeps listing
// every active alert.

export const NOTIFICATIONS_SEEN_KEY = "denarius:notifications:seen";

/** Same-tab signal so the header badge clears without a reload. */
export const NOTIFICATIONS_SEEN_EVENT = "denarius:notifications:seen";

export function parseSeenNotificationIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function serializeSeenNotificationIds(
  ids: Iterable<string>,
): string {
  return JSON.stringify([...ids]);
}

/** Active alerts the badge still has to surface (unseen only). */
export function unseenNotificationIds(
  activeIds: readonly string[],
  seen: ReadonlySet<string> | readonly string[],
): string[] {
  const seenSet = seen instanceof Set ? seen : new Set(seen);
  return activeIds.filter((id) => !seenSet.has(id));
}
