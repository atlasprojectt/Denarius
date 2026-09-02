import { reportDate, reportMonth, reportPeriodPath } from "@/lib/reports/format";
import { normalizeSearchText, rankSearchResults } from "../ranking";
import type { SearchProvider, SearchResult } from "../types";

export const reportsSearchProvider: SearchProvider = {
  type: "report",
  label: "Relatórios",
  async search({ client, tenantId }, query) {
    const { data, error } = await client
      .from("period_snapshot")
      .select("id, period_month, closed_at")
      .eq("tenant_id", tenantId)
      .order("period_month", { ascending: false })
      .limit(24);
    if (error) throw error;
    const normalizedQuery = normalizeSearchText(query);
    const results: SearchResult[] = (data ?? [])
      .map((row: { id: string; period_month: string; closed_at: string }) => {
        const period = reportPeriodPath(row.period_month);
        return {
          id: row.id,
          type: "report" as const,
          title: reportMonth(row.period_month),
          subtitle: `Fechado em ${reportDate(row.closed_at)}`,
          href: `/relatorios/${period}`,
          metadata: period,
          updatedAt: row.closed_at,
        };
      })
      .filter((result: SearchResult) =>
        normalizeSearchText(
          `${result.title} ${result.subtitle} ${result.metadata}`,
        ).includes(normalizedQuery),
      );
    return rankSearchResults(results, query);
  },
};
