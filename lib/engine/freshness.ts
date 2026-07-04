// Denarius engine — connector freshness (pure, no I/O). Honesty in the chrome:
// every key number carries an "as of <date>", and when a connector's last sync
// failed or went stale we say so out loud ("Anthropic hasn't synced in 3 days —
// totals may be understated"), never a silent understatement (invariant #3, and
// frontend §3.2 stale-data banner).

export type ProviderName = "openai" | "anthropic";

export type SyncState = "fresh" | "stale" | "failed" | "never";

export type ConnectionStatus = {
  provider: ProviderName;
  /** provider_connection.status: active | error | revoked. */
  status: string;
  /** provider_connection.last_sync_at (ISO) or null if never synced. */
  lastSyncAt: string | null;
};

export type ConnectionFreshness = {
  provider: ProviderName;
  state: SyncState;
  /** Whole hours since the last successful sync, or null when never synced. */
  ageHours: number | null;
};

/** Default staleness threshold: a connector is stale once >1 day without a
 *  successful sync (daily cron cadence — one missed run is the signal). */
export const STALE_AFTER_HOURS = 24;

/**
 * Classifies one connection. `revoked` connections return null (not shown as a
 * problem — the user turned them off on purpose); the caller filters those out.
 */
export function connectionFreshness(
  connection: ConnectionStatus,
  now: Date = new Date(),
  staleAfterHours: number = STALE_AFTER_HOURS,
): ConnectionFreshness | null {
  if (connection.status === "revoked") return null;

  if (connection.status === "error") {
    return { provider: connection.provider, state: "failed", ageHours: ageHoursSince(connection.lastSyncAt, now) };
  }
  if (connection.lastSyncAt === null) {
    return { provider: connection.provider, state: "never", ageHours: null };
  }

  const ageHours = ageHoursSince(connection.lastSyncAt, now)!;
  const state: SyncState = ageHours > staleAfterHours ? "stale" : "fresh";
  return { provider: connection.provider, state, ageHours };
}

function ageHoursSince(iso: string | null, now: Date): number | null {
  if (iso === null) return null;
  const ms = now.getTime() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 3_600_000));
}

export type Freshness = {
  /** Per-connection classification (revoked excluded). */
  connections: ConnectionFreshness[];
  /** Connections that need to be surfaced in a banner (failed / stale / never). */
  needsAttention: ConnectionFreshness[];
  /** True when at least one active connection is failed, stale, or never synced. */
  showBanner: boolean;
};

/**
 * Rolls per-connection freshness into the banner decision for a screen. A
 * connection needs attention when it is failed, stale, or never synced — each
 * means the on-screen totals may be understated and the user must know.
 */
export function freshness(
  connections: ConnectionStatus[],
  now: Date = new Date(),
  staleAfterHours: number = STALE_AFTER_HOURS,
): Freshness {
  const classified = connections
    .map((c) => connectionFreshness(c, now, staleAfterHours))
    .filter((c): c is ConnectionFreshness => c !== null);
  const needsAttention = classified.filter((c) => c.state !== "fresh");
  return {
    connections: classified,
    needsAttention,
    showBanner: needsAttention.length > 0,
  };
}
