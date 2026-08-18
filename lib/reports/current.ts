import "server-only";

import { getReportParts } from "@/lib/home/queries";
import { buildPeriodSnapshot, type PeriodSnapshot } from "@/lib/snapshot/build";
import { createClient } from "@/lib/supabase/server";

// Read path for the ON-DEMAND report (#96): the same executive document as a
// closed month, but describing the month that is still running, generated the
// moment the user asks for it.
//
// Two deliberate differences from lib/reports/queries.ts, which serves the
// frozen months:
//
//  - It is LIVE, not stored. Nothing is written; there is no row, no migration
//    and no history. A partial month is a photograph, not an artifact — the
//    closed month remains the only thing the product asserts as final.
//  - It runs under RLS (`createClient`), never the service role. The closing
//    job is cross-tenant by design and uses the admin client; this path is a
//    user reading their own tenant, so the session's policies are the guard.
//
// The numbers come from `buildPeriodSnapshot` fed `currentPeriod()` and
// `closed: false`, over the SAME memoized assembly Home reads
// (`getReportParts`). No arithmetic lives here — a report that recomputed
// anything could disagree with the cockpit the user was just looking at.

export type CurrentReport = PeriodSnapshot & {
  companyName: string;
  /** ISO instant the report was generated — its only "as of" stamp. */
  generatedAt: string;
};

export type CurrentReportRead =
  | { ok: true; report: CurrentReport }
  | { ok: false; report: null };

async function companyName(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("tenant").select("name").maybeSingle();
  return (data as { name: string } | null)?.name ?? "—";
}

/** The company's AI-spend situation as it stands right now. */
export async function currentReport(now: Date = new Date()): Promise<CurrentReport> {
  const [parts, name] = await Promise.all([getReportParts(), companyName()]);
  const generatedAt = now.toISOString();

  const snapshot = buildPeriodSnapshot({
    period: parts.period,
    closed: false,
    currency: parts.currency,
    source: "live",
    closedAt: generatedAt,
    orgBudget: parts.orgBudget,
    teamBudgets: parts.teamBudgets,
    fx: parts.fx,
    teams: parts.teams,
    // Seats are current state by definition here: the month is running, so
    // today's subscription configuration IS the configuration of the month.
    seats: { available: true, subscriptions: parts.subscriptions },
    apiUsdByTeam: parts.apiByTeam,
    apiUnattributedUsd: parts.apiUnattributedUsd,
    reportedByProvider: parts.providers,
    derivedUsd: parts.derivedUsd,
    hasUncosted: parts.hasUncosted,
    connections: parts.connections,
  });

  return { ...snapshot, companyName: name, generatedAt };
}

/** Keeps the frozen report history available when the live assembly fails. */
export async function readCurrentReport(): Promise<CurrentReportRead> {
  try {
    return { ok: true, report: await currentReport() };
  } catch {
    console.error("[reports] current read failed");
    return { ok: false, report: null };
  }
}
