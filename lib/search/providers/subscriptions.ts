import { counted } from "@/lib/plural";
import { escapeLikePattern, rankSearchResults } from "../ranking";
import type { SearchProvider, SearchResult } from "../types";

export const subscriptionsSearchProvider: SearchProvider = {
  type: "subscription",
  label: "Assinaturas",
  adminOnly: true,
  async search({ client, tenantId }, query) {
    const { data, error } = await client
      .from("subscription")
      .select("id, tool, seat_count, updated_at")
      .eq("tenant_id", tenantId)
      .ilike("tool", `%${escapeLikePattern(query)}%`)
      .limit(20);
    if (error) throw error;
    const results: SearchResult[] = (data ?? []).map((row: { id: string; tool: string; seat_count: number; updated_at: string }) => ({
      id: row.id,
      type: "subscription",
      title: row.tool,
      subtitle: counted(row.seat_count, "licença", "licenças"),
      href: "/ajustes/assinaturas",
      updatedAt: row.updated_at,
    }));
    return rankSearchResults(results, query);
  },
};
