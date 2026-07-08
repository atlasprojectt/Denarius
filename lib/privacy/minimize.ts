// Denarius — person-grain minimization (pure, no I/O). When a tenant turns
// "store per-person data" off (PRD story 55, LGPD data minimization), the
// daily sync must not persist which PERSON drove which tokens — but the team
// and org aggregates must stay exact. This collapses usage buckets to the
// team/project grain (userId dropped) BEFORE cost derivation and persistence.

import type { UsageBucket } from "@/lib/connectors/types";

/** Natural key of a bucket WITHOUT the user — everything sync keys on except
 *  user_id, so collapsing here can't drop or double-count a cell. */
function nonPersonKey(b: UsageBucket): string {
  // Fields are provider enums / ids without tabs; a tab is a safe separator.
  return [b.date, b.projectId, b.apiKeyId, b.model].join("\t");
}

/**
 * Sums token counts across all users of each (date, project, key, model) cell
 * and blanks userId — the "shared key" sentinel that already rolls up to the
 * team, never a person (teamDetail treats userId="" as shared). Totals are
 * preserved exactly: nothing is dropped, only re-bucketed. Returns the input
 * unchanged in shape (one bucket per non-person key).
 */
export function collapsePersonGrain(buckets: UsageBucket[]): UsageBucket[] {
  const byKey = new Map<string, UsageBucket>();
  for (const b of buckets) {
    const key = nonPersonKey(b);
    const existing = byKey.get(key);
    if (existing) {
      existing.inputTokens += b.inputTokens;
      existing.outputTokens += b.outputTokens;
    } else {
      byKey.set(key, { ...b, userId: "" });
    }
  }
  return [...byKey.values()];
}
