import { z } from "zod";

import { connectionsSearchProvider } from "./providers/connections";
import { reportsSearchProvider } from "./providers/reports";
import { subscriptionsSearchProvider } from "./providers/subscriptions";
import { teamsSearchProvider } from "./providers/teams";
import type { SearchContext, SearchProvider, SearchResponse } from "./types";

export const MIN_SEARCH_LENGTH = 2;
export const MAX_SEARCH_LENGTH = 80;
export const SEARCH_GROUP_LIMIT = 5;
export const SEARCH_TOTAL_LIMIT = 20;

const querySchema = z.string().trim().min(MIN_SEARCH_LENGTH).max(MAX_SEARCH_LENGTH);

export const searchProviders: SearchProvider[] = [
  teamsSearchProvider,
  reportsSearchProvider,
  subscriptionsSearchProvider,
  connectionsSearchProvider,
];

export function parseSearchQuery(value: unknown): string | null {
  const parsed = querySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function aggregateSearch(
  context: SearchContext,
  rawQuery: unknown,
  providers: SearchProvider[] = searchProviders,
  onProviderError?: (provider: SearchProvider, error: unknown) => void,
): Promise<SearchResponse> {
  const query = parseSearchQuery(rawQuery);
  if (!query) return { status: "idle", groups: [] };

  const allowed = providers.filter(
    (provider) => !provider.adminOnly || context.role === "admin",
  );
  const settled = await Promise.allSettled(
    allowed.map((provider) => provider.search(context, query)),
  );
  let failures = 0;
  let remaining = SEARCH_TOTAL_LIMIT;
  const groups = settled.flatMap((result, index) => {
    const provider = allowed[index];
    if (result.status === "rejected") {
      failures += 1;
      onProviderError?.(provider, result.reason);
      return [];
    }
    const results = result.value.slice(0, Math.min(SEARCH_GROUP_LIMIT, remaining));
    remaining -= results.length;
    return results.length ? [{ type: provider.type, label: provider.label, results }] : [];
  });

  if (failures === allowed.length) return { status: "error", groups: [] };
  return { status: failures ? "partial" : "ok", groups };
}
