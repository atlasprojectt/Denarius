"use server";

import { requireSession } from "@/lib/auth/session";
import { logThrown } from "@/lib/logging/server-log";
import { createClient } from "@/lib/supabase/server";
import { aggregateSearch } from "./search";
import type { SearchResponse } from "./types";

export async function searchWorkspace(query: string): Promise<SearchResponse> {
  let tenantId: string | null = null;
  try {
    const auth = await requireSession();
    if (!auth.session) return { status: "error", groups: [] };
    tenantId = auth.session.tenantId;
    const client = await createClient();
    return aggregateSearch(
      { client, tenantId, role: auth.session.role },
      query,
      undefined,
      (provider, error) =>
        logThrown(`search.provider.${provider.type}`, tenantId, error),
    );
  } catch (error) {
    logThrown("search.execute", tenantId, error);
    return { status: "error", groups: [] };
  }
}
