import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { AuditAction } from "./log";

/** How many entries the view shows. Deliberately a sane ceiling and not
 *  pagination: this is evidence, not an analytics feature (issue #73). */
export const AUDIT_PAGE_SIZE = 100;

export type AuditEntry = {
  id: string;
  actorEmail: string;
  action: AuditAction;
  target: string | null;
  createdAt: string;
};

/**
 * A read that failed and a trail that is genuinely empty are NOT the same
 * answer, and on an evidence surface the difference is the whole point: a
 * swallowed error renders "nothing was recorded", which is a confident claim
 * that no administrative action ever happened. Deploying before the migration
 * lands produces exactly that. So the failure is carried, not flattened.
 */
export type AuditRead =
  | { ok: true; entries: AuditEntry[] }
  | { ok: false; entries: [] };

/**
 * The tenant's trail, newest first. Read through the TENANT-SCOPED client, so
 * the RLS policy is the authority: a Viewer's session reads nothing here, and
 * no tenant can see another's rows even if a caller forgot a filter.
 */
export async function listAuditEntries(): Promise<AuditRead> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, actor_email, action, target, created_at")
    .order("created_at", { ascending: false })
    .limit(AUDIT_PAGE_SIZE);

  if (error) {
    // The cause belongs in the server log; the screen only needs to know that
    // it must not claim emptiness.
    console.error(`[audit] could not read the trail: ${error.code}`);
    return { ok: false, entries: [] };
  }

  const entries = ((data ?? []) as {
    id: string;
    actor_email: string;
    action: AuditAction;
    target: string | null;
    created_at: string;
  }[]).map((row) => ({
    id: row.id,
    actorEmail: row.actor_email,
    action: row.action,
    target: row.target,
    createdAt: row.created_at,
  }));

  return { ok: true, entries };
}
