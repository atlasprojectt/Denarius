import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type Team = { id: string; name: string };

/** People teams for selects and listings — excludes the internal Unattributed bucket. */
export async function listTeams(): Promise<Team[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team")
    .select("id, name")
    .eq("is_unattributed", false)
    .order("name");
  return (data ?? []) as Team[];
}

/**
 * Write-guard shared by every mutation that takes a team id: the team must
 * belong to this tenant and not be the internal Unattributed bucket.
 * null = shared/company-wide, always valid where the caller allows it.
 */
export async function isOwnedTeam(
  client: SupabaseClient,
  tenantId: string,
  teamId: string | null,
): Promise<boolean> {
  if (teamId === null) return true;
  const { data } = await client
    .from("team")
    .select("is_unattributed")
    .eq("id", teamId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const team = data as { is_unattributed: boolean } | null;
  return team !== null && !team.is_unattributed;
}
