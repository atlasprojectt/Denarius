// Denarius — per-team API diagnosis grouping (pure, no I/O). One pass over the
// month's mapped usage rows produces everything a team's diagnosis page shows:
// the costed daily series (feeds buildCumulativeSpend), the by-provider split
// (derived cost only — cost_daily has no team grain, so a per-team source
// split can only be honest at the token-derived grain, disclosed at the UI),
// and the per-person contributors with the same semantics the old drill-down
// had: a shared key (userId "") rolls up to one team-level row, never a
// person; uncosted models are flagged, never dropped (invariant #3); when
// names may not be shown, person ids are replaced with stable anonymous
// labels BEFORE the data leaves the server (product principle #1).

import { anonymousLabel } from "@/lib/privacy/policy";

/** One month-to-date usage row already resolved to a team via project_map.
 *  Unmapped rows are the Unattributed bucket and never reach a diagnosis. */
export type DiagnosisUsageRow = {
  teamId: string;
  /** ISO date (YYYY-MM-DD, UTC). */
  date: string;
  provider: string;
  /** Provider user id; "" = shared key. */
  userId: string;
  inputTokens: number;
  outputTokens: number;
  derivedCost: number | null;
  uncosted: boolean;
};

export type PersonSpend = {
  /** provider user id, a "Colaborador N" label when names are hidden, or ""
   *  for a shared key. */
  userId: string;
  /** true when this row is a shared key rolled up to the team, never a person. */
  isShared: boolean;
  derivedUsd: number;
  uncosted: boolean;
  inputTokens: number;
  outputTokens: number;
};

export type TeamApiDiagnosis = {
  /** Costed derived USD per day, ascending by date. */
  daily: { date: string; usd: number }[];
  /** Costed derived USD per provider, descending. */
  byProvider: { provider: string; usd: number }[];
  /** Contributors, descending by cost, shared key last. */
  persons: PersonSpend[];
  /** Σ persons (costed derivation only). */
  totalUsd: number;
  /** Some usage in this team carries an uncosted model. */
  hasUncosted: boolean;
};

/** Groups mapped usage rows into one diagnosis per team. */
export function groupTeamDiagnosis(
  rows: DiagnosisUsageRow[],
  options: { namesHidden: boolean },
): Map<string, TeamApiDiagnosis> {
  type Bucket = {
    byDate: Map<string, number>;
    byProvider: Map<string, number>;
    byUser: Map<string, PersonSpend>;
    hasUncosted: boolean;
  };
  const buckets = new Map<string, Bucket>();

  for (const row of rows) {
    const bucket =
      buckets.get(row.teamId) ??
      ({
        byDate: new Map(),
        byProvider: new Map(),
        byUser: new Map(),
        hasUncosted: false,
      } satisfies Bucket);
    buckets.set(row.teamId, bucket);

    const costed = !row.uncosted && row.derivedCost !== null;
    if (costed) {
      const cost = row.derivedCost as number;
      bucket.byDate.set(row.date, (bucket.byDate.get(row.date) ?? 0) + cost);
      bucket.byProvider.set(
        row.provider,
        (bucket.byProvider.get(row.provider) ?? 0) + cost,
      );
    } else {
      bucket.hasUncosted = true;
    }

    const person =
      bucket.byUser.get(row.userId) ??
      ({
        userId: row.userId,
        isShared: row.userId === "",
        derivedUsd: 0,
        uncosted: false,
        inputTokens: 0,
        outputTokens: 0,
      } satisfies PersonSpend);
    person.inputTokens += row.inputTokens;
    person.outputTokens += row.outputTokens;
    if (costed) person.derivedUsd += row.derivedCost as number;
    else person.uncosted = true;
    bucket.byUser.set(row.userId, person);
  }

  const result = new Map<string, TeamApiDiagnosis>();
  for (const [teamId, bucket] of buckets) {
    const sorted = [...bucket.byUser.values()].sort((a, b) => {
      if (a.isShared !== b.isShared) return a.isShared ? 1 : -1;
      return b.derivedUsd - a.derivedUsd;
    });
    // Anonymous labels are assigned per team, in display order, so the same
    // render always reads consistently. Shared-key rows are person-free and
    // keep their own labeling.
    let personIndex = 0;
    const persons = sorted.map((p) =>
      options.namesHidden && !p.isShared
        ? { ...p, userId: anonymousLabel(personIndex++) }
        : p,
    );

    result.set(teamId, {
      daily: [...bucket.byDate.entries()]
        .map(([date, usd]) => ({ date, usd }))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
      byProvider: [...bucket.byProvider.entries()]
        .map(([provider, usd]) => ({ provider, usd }))
        .sort((a, b) => b.usd - a.usd),
      persons,
      totalUsd: persons.reduce((sum, p) => sum + p.derivedUsd, 0),
      hasUncosted: bucket.hasUncosted,
    });
  }
  return result;
}
