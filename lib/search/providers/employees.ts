import { escapeLikePattern, rankSearchResults } from "../ranking";
import type { SearchProvider } from "../types";

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  team: { name: string } | { name: string }[] | null;
  updated_at: string;
};

function teamName(team: EmployeeRow["team"]): string {
  return Array.isArray(team) ? team[0]?.name ?? "Sem time" : team?.name ?? "Sem time";
}

export const employeesSearchProvider: SearchProvider = {
  type: "employee",
  label: "Funcionários",
  adminOnly: true,
  async search({ client, tenantId }, query) {
    const pattern = `%${escapeLikePattern(query)}%`;
    const [byName, byEmail] = await Promise.all([
      client.from("employee").select("id, name, email, updated_at, team:team_id(name)").eq("tenant_id", tenantId).ilike("name", pattern).limit(20),
      client.from("employee").select("id, name, email, updated_at, team:team_id(name)").eq("tenant_id", tenantId).ilike("email", pattern).limit(20),
    ]);
    if (byName.error) throw byName.error;
    if (byEmail.error) throw byEmail.error;
    const rows = new Map<string, EmployeeRow>();
    for (const row of [...(byName.data ?? []), ...(byEmail.data ?? [])]) {
      rows.set(row.id, {
        id: row.id,
        name: row.name,
        email: row.email,
        team: row.team,
        updated_at: row.updated_at,
      });
    }
    return rankSearchResults(
      [...rows.values()].map((row) => ({
        id: row.id,
        type: "employee" as const,
        title: row.name,
        subtitle: teamName(row.team),
        metadata: row.email,
        href: `/ajustes/roster#employee-${row.id}`,
        updatedAt: row.updated_at,
      })),
      query,
    );
  },
};

