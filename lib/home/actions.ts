"use server";

import { getNextActions, type Observation } from "@/lib/home/queries";

// On-demand read for the global header "Próximas ações" pop-up. A server action
// (not RSC) so the always-present header pays nothing per navigation — the
// actions are computed only when the user opens the pop-up. Runs under RLS via
// the queries' server client, so it is tenant-scoped; no client DB access.
export async function fetchNextActions(): Promise<Observation[]> {
  return getNextActions();
}
