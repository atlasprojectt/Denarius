import { normalizeSearchText, rankSearchResults } from "../ranking";
import { monthStartUtc } from "@/lib/engine/period";
import type { SearchProvider } from "../types";

type BudgetRow = {
  id: string;
  scope: "org" | "team";
  currency: string;
  updated_at: string;
  team: { name: string } | { name: string }[] | null;
};

function teamName(team: BudgetRow["team"]): string {
  return Array.isArray(team) ? team[0]?.name ?? "Time" : team?.name ?? "Time";
}

export const budgetsSearchProvider: SearchProvider = {
  type: "budget",
  label: "Orçamentos",
  async search({ client, tenantId }, query) {
    const { data, error } = await client
      .from("budget")
      .select("id, scope, currency, updated_at, team:team_id(name)")
      .eq("tenant_id", tenantId)
      .eq("period_month", monthStartUtc())
      .limit(50);
    if (error) throw error;
    const normalizedQuery = normalizeSearchText(query);
    return rankSearchResults(
      (data ?? [])
        .map((row: BudgetRow) => ({
          id: row.id,
          type: "budget" as const,
          title: row.scope === "org" ? "Orçamento da empresa" : `Orçamento · ${teamName(row.team)}`,
          subtitle: `Limite mensal · ${row.currency}`,
          href: "/ajustes/orcamentos",
          updatedAt: row.updated_at,
        }))
        .filter((result) => normalizeSearchText(`${result.title} ${result.subtitle}`).includes(normalizedQuery)),
      query,
    );
  },
};

