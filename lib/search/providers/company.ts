import { normalizeSearchText, rankSearchResults } from "../ranking";
import type { SearchProvider } from "../types";

export const companySearchProvider: SearchProvider = {
  type: "company",
  label: "Empresa",
  async search({ client, tenantId }, query) {
    const { data, error } = await client
      .from("tenant")
      .select("id, name, display_currency, created_at")
      .eq("id", tenantId)
      .maybeSingle();
    if (error) throw error;
    if (!data || !normalizeSearchText(`${data.name} ${data.display_currency}`).includes(normalizeSearchText(query))) return [];
    return rankSearchResults([{
      id: data.id,
      type: "company",
      title: data.name,
      subtitle: `Empresa · moeda ${data.display_currency}`,
      href: "/ajustes/empresa",
      updatedAt: data.created_at,
    }], query);
  },
};

