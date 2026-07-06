// Denarius — alert planning (pure, no I/O). Bridges the engine's dedup rule
// (notificationsToFire) to delivery: which single email to send for one scope
// this run, and which levels to record in notification_log.

import {
  notificationsToFire,
  type ThresholdLevel,
} from "@/lib/engine/thresholds";

export type AlertPlan = {
  /** The one level to email — the most severe newly-crossed one — or null. */
  emailLevel: ThresholdLevel | null;
  /** Every newly-crossed level, all recorded as sent (subsumed by the email). */
  logLevels: ThresholdLevel[];
};

/**
 * One email per scope per run, never one per level: when a scope jumps past
 * several thresholds between syncs (e.g. straight to a projected breach), a
 * message per rung would be alert fatigue — the email carries the most severe
 * crossing and the log records all of them, so none re-fires later.
 */
export function planAlert(
  activeLevels: ThresholdLevel[],
  alreadySent: ThresholdLevel[],
): AlertPlan {
  const toFire = notificationsToFire(activeLevels, alreadySent);
  if (toFire.length === 0) return { emailLevel: null, logLevels: [] };
  // notificationsToFire returns ascending severity — last is the most severe.
  return { emailLevel: toFire[toFire.length - 1], logLevels: toFire };
}
