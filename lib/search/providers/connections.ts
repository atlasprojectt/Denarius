import { escapeLikePattern, rankSearchResults } from "../ranking";
import type { SearchProvider, SearchResult } from "../types";

const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

const STATUS: Record<string, string> = {
  active: "Conexão ativa",
  error: "Conexão requer atenção",
  revoked: "Conexão revogada",
};

export const connectionsSearchProvider: SearchProvider = {
  type: "connection",
  label: "Conexões",
  adminOnly: true,
  async search({ client, tenantId }, query) {
    const { data, error } = await client
      .from("provider_connection")
      .select("id, provider, status, updated_at")
      .eq("tenant_id", tenantId)
      .ilike("provider", `%${escapeLikePattern(query)}%`)
      .limit(20);
    if (error) throw error;
    const results: SearchResult[] = (data ?? []).map((row: { id: string; provider: string; status: string; updated_at: string }) => ({
      id: row.id,
      type: "connection",
      title: PROVIDER_NAMES[row.provider] ?? row.provider,
      subtitle: STATUS[row.status] ?? "Conexão",
      href: "/ajustes/conexoes",
      updatedAt: row.updated_at,
    }));
    return rankSearchResults(results, query);
  },
};
