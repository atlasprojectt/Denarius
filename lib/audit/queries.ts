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
 * The tenant's trail, newest first. Read through the TENANT-SCOPED client, so
 * the RLS policy is the authority: a Viewer's session reads nothing here, and
 * no tenant can see another's rows even if a caller forgot a filter.
 */
export async function listAuditEntries(): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, actor_email, action, target, created_at")
    .order("created_at", { ascending: false })
    .limit(AUDIT_PAGE_SIZE);

  return ((data ?? []) as {
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
}
