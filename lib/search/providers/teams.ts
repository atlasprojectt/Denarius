import { escapeLikePattern, rankSearchResults } from "../ranking";
import type { SearchProvider, SearchResult } from "../types";

export const teamsSearchProvider: SearchProvider = {
  type: "team",
  label: "Times",
  async search({ client, tenantId }, query) {
    const pattern = `%${escapeLikePattern(query)}%`;
    const { data, error } = await client
      .from("team")
      .select("id, name, created_at")
      .eq("tenant_id", tenantId)
      .eq("is_unattributed", false)
      .ilike("name", pattern)
      .limit(20);
    if (error) throw error;
    const results: SearchResult[] = (data ?? []).map((row: { id: string; name: string; created_at: string }) => ({
      id: row.id,
      type: "team",
      title: row.name,
      subtitle: "Time",
      href: `/times/${row.id}`,
      updatedAt: row.created_at,
    }));
    return rankSearchResults(results, query);
  },
};
