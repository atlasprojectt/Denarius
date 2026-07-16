import "server-only";

import { monthStartUtc } from "@/lib/engine/period";
import { reconcile, type Reconciliation } from "@/lib/engine/reconcile";
import { canSeeNames } from "@/lib/privacy/policy";
import { createClient } from "@/lib/supabase/server";
import {
  groupTeamDiagnosis,
  type DiagnosisUsageRow,
  type TeamApiDiagnosis,
} from "@/lib/usage/diagnose";

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

export type TeamsDiagnosis = {
  /** Diagnosis per team id — only teams with mapped usage appear. */
  byTeam: Map<string, TeamApiDiagnosis>;
  /** Names were withheld (Viewer, or the tenant names switch off) — person
   *  rows carry anonymous labels, disclosed in the UI. */
  namesHidden: boolean;
  /** The signed-in viewer is an Admin — gates the contributors block. */
  isAdmin: boolean;
};

/**
 * Month-to-date diagnosis for EVERY team in one pass (the Times page renders
 * all cards server-side): one usage_daily fetch resolved to teams via
 * project_map, grouped by the pure lib/usage/diagnose.ts. Unmapped rows are
 * the Unattributed bucket — surfaced at the list level, never diagnosed here.
 * Privacy decides at the data layer (#23): names never leave the server when
 * the viewer isn't an Admin or the tenant names switch is off.
 */
export async function teamsDiagnosis(): Promise<TeamsDiagnosis> {
  const supabase = await createClient();
  const since = monthStartUtc();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: mapData }, { data: usageData }, { data: viewer }, { data: tenantRow }] =
    await Promise.all([
      supabase.from("project_map").select("provider, project_id, team_id"),
      supabase
        .from("usage_daily")
        .select(
          "date, provider, project_id, user_id, input_tokens, output_tokens, derived_cost, uncosted",
        )
        .gte("date", since),
      user
        ? supabase.from("app_user").select("role").eq("id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("tenant").select("show_names").maybeSingle(),
    ]);

  const role = (viewer as { role: string } | null)?.role ?? "viewer";
  const showNames = (tenantRow as { show_names: boolean } | null)?.show_names ?? true;
  const namesHidden = !canSeeNames({ role, showNames });

  const projectTeam = new Map<string, string>();
  for (const m of (mapData ?? []) as MapRow[]) {
    projectTeam.set(mapKey(m.provider, m.project_id), m.team_id);
  }

  type DatedUsageRow = UsageRow & { date: string };
  const rows: DiagnosisUsageRow[] = [];
  for (const row of (usageData ?? []) as DatedUsageRow[]) {
    const teamId =
      row.project_id === ""
        ? undefined
        : projectTeam.get(mapKey(row.provider, row.project_id));
    if (teamId === undefined) continue;
    rows.push({
      teamId,
      date: row.date,
      provider: row.provider,
      userId: row.user_id,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      derivedCost: row.derived_cost,
      uncosted: row.uncosted,
    });
  }

  return {
    byTeam: groupTeamDiagnosis(rows, { namesHidden }),
    namesHidden,
    isAdmin: role === "admin",
  };
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

