import "server-only";

import { monthStartUtc } from "@/lib/engine/period";
import { reconcile, type Reconciliation } from "@/lib/engine/reconcile";
import { anonymousLabel, canSeeNames } from "@/lib/privacy/policy";
import { createClient } from "@/lib/supabase/server";

// Attribution of API usage → team, read under RLS for the Explore screens.
// The provider-native grain (OpenAI project_id / Anthropic workspace_id, both
// in usage_daily.project_id) is pinned to a team by project_map; anything
// unmapped rolls into Unattributed, so the invariant orgTotal = Σ teams +
// Unattributed holds by construction (architecture §5.3). Derived cost is USD
// (source of truth); frozen-FX display of a combined seats+API number waits for
// budgets (#18), so this stays a USD-only view for now.

const UNATTRIBUTED = "__unattributed__";

type UsageRow = {
  provider: string;
  project_id: string;
  user_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  derived_cost: number | null;
  uncosted: boolean;
};

type MapRow = { provider: string; project_id: string; team_id: string };
type TeamRow = { id: string; name: string };

export type TeamApiSpend = {
  teamId: string;
  teamName: string;
  derivedUsd: number;
  /** at least one bucket for this team is uncosted (not in derivedUsd). */
  uncosted: boolean;
};

export type ApiAttribution = {
  teams: TeamApiSpend[]; // sorted desc by derived cost
  unattributedUsd: number;
  /** Σ teams + unattributed, costed derivation only. */
  orgTotalUsd: number;
  /** Σ provider-reported cost (cost_daily) for the same window. */
  reportedUsd: number;
  /** any usage bucket carries an uncosted model — explains derived < reported. */
  hasUncosted: boolean;
  reconciliation: Reconciliation;
  hasData: boolean;
};

/** The one project_map lookup key — provider is a fixed enum with no spaces,
 *  so a space is a safe separator. Exported so every attribution consumer
 *  (Explore, home apontamentos, notifications) keys the same way. */
export function mapKey(provider: string, projectId: string): string {
  return `${provider} ${projectId}`;
}

/** Month-to-date derived API spend rolled up by team, with reconciliation. */
export async function teamApiSpend(): Promise<ApiAttribution> {
  const supabase = await createClient();
  const since = monthStartUtc();

  const [{ data: usageData }, { data: mapData }, { data: teamData }, { data: costData }] =
    await Promise.all([
      supabase
        .from("usage_daily")
        .select("provider, project_id, derived_cost, uncosted")
        .gte("date", since),
      supabase.from("project_map").select("provider, project_id, team_id"),
      supabase.from("team").select("id, name").eq("is_unattributed", false),
      supabase.from("cost_daily").select("amount").gte("date", since),
    ]);

  const teamName = new Map<string, string>(
    ((teamData ?? []) as TeamRow[]).map((t) => [t.id, t.name]),
  );
  const projectTeam = new Map<string, string>();
  for (const m of (mapData ?? []) as MapRow[]) {
    projectTeam.set(mapKey(m.provider, m.project_id), m.team_id);
  }

  // teamId (or UNATTRIBUTED) → { derived, uncosted }
  const buckets = new Map<string, { derivedUsd: number; uncosted: boolean }>();
  const bump = (key: string, cost: number | null, uncosted: boolean) => {
    const b = buckets.get(key) ?? { derivedUsd: 0, uncosted: false };
    if (uncosted || cost === null) b.uncosted = true;
    else b.derivedUsd += cost;
    buckets.set(key, b);
  };

  let hasUncosted = false;
  for (const row of (usageData ?? []) as UsageRow[]) {
    if (row.uncosted || row.derived_cost === null) hasUncosted = true;
    const teamId =
      row.project_id === "" ? undefined : projectTeam.get(mapKey(row.provider, row.project_id));
    bump(teamId ?? UNATTRIBUTED, row.derived_cost, row.uncosted);
  }

  const teams: TeamApiSpend[] = [];
  let unattributedUsd = 0;
  for (const [key, b] of buckets) {
    if (key === UNATTRIBUTED) {
      unattributedUsd = b.derivedUsd;
      continue;
    }
    teams.push({
      teamId: key,
      teamName: teamName.get(key) ?? "—",
      derivedUsd: b.derivedUsd,
      uncosted: b.uncosted,
    });
  }
  teams.sort((a, b) => b.derivedUsd - a.derivedUsd);

  const orgTotalUsd =
    teams.reduce((sum, t) => sum + t.derivedUsd, 0) + unattributedUsd;
  const reportedUsd = ((costData ?? []) as { amount: number }[]).reduce(
    (sum, r) => sum + r.amount,
    0,
  );

  return {
    teams,
    unattributedUsd,
    orgTotalUsd,
    reportedUsd,
    hasUncosted,
    reconciliation: reconcile(orgTotalUsd, reportedUsd),
    hasData: (usageData ?? []).length > 0,
  };
}

/** Costed derived USD per day for one team's mapped projects, this month —
 *  feeds the drill-down cumulative chart (engine does the combine). */
export async function teamDailyApiUsd(
  teamId: string,
): Promise<{ date: string; usd: number }[]> {
  const supabase = await createClient();
  const since = monthStartUtc();

  const [{ data: mapData }, { data: usageData }] = await Promise.all([
    supabase
      .from("project_map")
      .select("provider, project_id")
      .eq("team_id", teamId),
    supabase
      .from("usage_daily")
      .select("date, provider, project_id, derived_cost, uncosted")
      .gte("date", since),
  ]);

  const mapped = new Set(
    ((mapData ?? []) as { provider: string; project_id: string }[]).map((m) =>
      mapKey(m.provider, m.project_id),
    ),
  );

  type DailyRow = UsageRow & { date: string };
  const byDate = new Map<string, number>();
  for (const row of (usageData ?? []) as DailyRow[]) {
    if (row.uncosted || row.derived_cost === null) continue;
    if (!mapped.has(mapKey(row.provider, row.project_id))) continue;
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.derived_cost);
  }

  return [...byDate.entries()].map(([date, usd]) => ({ date, usd }));
}

export type MappableProject = {
  provider: string;
  projectId: string;
  derivedUsd: number;
  uncosted: boolean;
  /** currently mapped team, or null when unmapped. */
  teamId: string | null;
};

/** Distinct provider projects/workspaces seen this month, for the mapping UI. */
export async function listMappableProjects(): Promise<MappableProject[]> {
  const supabase = await createClient();
  const since = monthStartUtc();

  const [{ data: usageData }, { data: mapData }] = await Promise.all([
    supabase
      .from("usage_daily")
      .select("provider, project_id, derived_cost, uncosted")
      .gte("date", since),
    supabase.from("project_map").select("provider, project_id, team_id"),
  ]);

  const projectTeam = new Map<string, string>();
  for (const m of (mapData ?? []) as MapRow[]) {
    projectTeam.set(mapKey(m.provider, m.project_id), m.team_id);
  }

  const byProject = new Map<string, MappableProject>();
  for (const row of (usageData ?? []) as UsageRow[]) {
    if (row.project_id === "") continue; // no id to pin to a team
    const key = mapKey(row.provider, row.project_id);
    const entry =
      byProject.get(key) ??
      ({
        provider: row.provider,
        projectId: row.project_id,
        derivedUsd: 0,
        uncosted: false,
        teamId: projectTeam.get(key) ?? null,
      } satisfies MappableProject);
    if (row.uncosted || row.derived_cost === null) entry.uncosted = true;
    else entry.derivedUsd += row.derived_cost;
    byProject.set(key, entry);
  }

  return [...byProject.values()].sort((a, b) => {
    if (a.provider !== b.provider) return a.provider < b.provider ? -1 : 1;
    return b.derivedUsd - a.derivedUsd;
  });
}

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

export type TeamDetail = {
  teamId: string;
  teamName: string;
  /** false when the team id is unknown / not this tenant's. */
  found: boolean;
  persons: PersonSpend[]; // sorted desc by derived cost, shared keys last
  totalUsd: number;
  hasUncosted: boolean;
  /** true when names were withheld (Viewer, or the tenant names switch off) —
   *  person rows carry anonymous labels, disclosed in the UI. */
  namesHidden: boolean;
};

/**
 * Per-person API cost inside one team (Admin-only — names/ids are gated at the
 * call site). Usage with a provider user id becomes a person row; usage on a
 * shared key (user_id = "") rolls up to a single "shared key" row, never a
 * person (product principle #1: control, not surveillance). Anthropic has no
 * user grain, so all its usage lands in the shared row by construction.
 */
export async function teamDetail(teamId: string): Promise<TeamDetail> {
  const supabase = await createClient();
  const since = monthStartUtc();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: teamRow }, { data: mapData }, { data: usageData }, { data: viewer }, { data: tenantRow }] =
    await Promise.all([
      supabase
        .from("team")
        .select("name")
        .eq("id", teamId)
        .eq("is_unattributed", false)
        .maybeSingle(),
      supabase.from("project_map").select("provider, project_id").eq("team_id", teamId),
      supabase
        .from("usage_daily")
        .select("provider, project_id, user_id, input_tokens, output_tokens, derived_cost, uncosted")
        .gte("date", since),
      user
        ? supabase.from("app_user").select("role").eq("id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("tenant").select("show_names").maybeSingle(),
    ]);

  // Privacy decision at the data layer (#23): names never leave the server
  // when the viewer isn't an Admin, or the tenant names switch is off.
  const role = (viewer as { role: string } | null)?.role ?? "viewer";
  const showNames = (tenantRow as { show_names: boolean } | null)?.show_names ?? true;
  const namesHidden = !canSeeNames({ role, showNames });

  const team = teamRow as { name: string } | null;
  if (!team) {
    return {
      teamId,
      teamName: "—",
      found: false,
      persons: [],
      totalUsd: 0,
      hasUncosted: false,
      namesHidden,
    };
  }

  const mappedProjects = new Set(
    ((mapData ?? []) as { provider: string; project_id: string }[]).map((m) =>
      mapKey(m.provider, m.project_id),
    ),
  );

  const byUser = new Map<string, PersonSpend>();
  let hasUncosted = false;
  for (const row of (usageData ?? []) as UsageRow[]) {
    if (!mappedProjects.has(mapKey(row.provider, row.project_id))) continue;
    const key = row.user_id === "" ? "" : row.user_id;
    const entry =
      byUser.get(key) ??
      ({
        userId: key,
        isShared: key === "",
        derivedUsd: 0,
        uncosted: false,
        inputTokens: 0,
        outputTokens: 0,
      } satisfies PersonSpend);
    entry.inputTokens += row.input_tokens;
    entry.outputTokens += row.output_tokens;
    if (row.uncosted || row.derived_cost === null) {
      entry.uncosted = true;
      hasUncosted = true;
    } else {
      entry.derivedUsd += row.derived_cost;
    }
    byUser.set(key, entry);
  }

  const sorted = [...byUser.values()].sort((a, b) => {
    if (a.isShared !== b.isShared) return a.isShared ? 1 : -1;
    return b.derivedUsd - a.derivedUsd;
  });
  // When names are hidden, replace each identified person's id with a stable
  // anonymous label BEFORE returning — the real id never reaches the client.
  // Shared-key rows are already person-free and keep their own labeling.
  let personIndex = 0;
  const persons = sorted.map((p) =>
    namesHidden && !p.isShared
      ? { ...p, userId: anonymousLabel(personIndex++) }
      : p,
  );
  const totalUsd = persons.reduce((sum, p) => sum + p.derivedUsd, 0);

  return { teamId, teamName: team.name, found: true, persons, totalUsd, hasUncosted, namesHidden };
}
