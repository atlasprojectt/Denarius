import "server-only";

import type { SeatSubscription } from "@/lib/engine/accrual";
import { listBudgets, type BudgetList } from "@/lib/budgets/queries";
import { isUndefinedColumn } from "@/lib/db/schema-drift";
import { dbFailure, logFailure } from "@/lib/logging/server-log";
import { listSubscriptions } from "@/lib/subscriptions/queries";
import { createClient } from "@/lib/supabase/server";
import { listTeams, type Team } from "@/lib/teams/queries";

import type { SetupProgress } from "./steps";

export type SetupConnection = {
  provider: string;
  status: string;
  last_sync_at: string | null;
  last_sync_error: string | null;
};

/** Everything the setup card reads, in one round of parallel queries. */
export type SetupSnapshot = {
  progress: SetupProgress;
  connections: SetupConnection[];
  subscriptions: SeatSubscription[];
  currency: string;
  teams: Team[];
  rosterCount: number;
  budgets: BudgetList;
};

/**
 * Whether the signed-in user's tenant still owes the guided setup. Fails open:
 * before the setup-completion migration reaches this database, or on a read
 * error, the cockpit stays reachable — a first-run flow must never lock a
 * running company out of its own data.
 */
export async function isSetupPending(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant")
    .select("setup_completed_at")
    .maybeSingle();
  if (error) {
    if (!isUndefinedColumn(error)) logFailure("setup.pending", null, dbFailure(error));
    return false;
  }
  return data !== null && data.setup_completed_at === null;
}

/** Read for a tenant that already exists (the company step is done). */
export async function getSetupSnapshot(): Promise<SetupSnapshot> {
  const supabase = await createClient();
  const [
    { data: connectionData },
    { subscriptions, currency },
    teams,
    { count: rosterCount },
    budgets,
  ] = await Promise.all([
    supabase
      .from("provider_connection")
      .select("provider, status, last_sync_at, last_sync_error"),
    listSubscriptions(),
    listTeams(),
    supabase.from("employee").select("id", { count: "exact", head: true }),
    listBudgets(),
  ]);
  const connections = (connectionData ?? []) as SetupConnection[];

  return {
    progress: {
      hasCompany: true,
      hasActiveConnection: connections.some((c) => c.status === "active"),
      hasSubscriptions: subscriptions.length > 0,
      hasRoster: (rosterCount ?? 0) > 0,
      hasBudget: budgets.org !== null,
    },
    connections,
    subscriptions,
    currency,
    teams,
    rosterCount: rosterCount ?? 0,
    budgets,
  };
}
