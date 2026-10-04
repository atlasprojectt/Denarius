import { escapeLikePattern, rankSearchResults } from "../ranking";
import type { SearchProvider } from "../types";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  viewer: "Visualizador",
};

type UserRow = {
  id: string;
  display_name: string | null;
  email: string;
  role: string;
  created_at: string;
};

export const usersSearchProvider: SearchProvider = {
  type: "user",
  label: "Usuários com acesso",
  adminOnly: true,
  async search({ client, tenantId }, query) {
    const pattern = `%${escapeLikePattern(query)}%`;
    const [byName, byEmail] = await Promise.all([
      client.from("app_user").select("id, display_name, email, role, created_at").eq("tenant_id", tenantId).ilike("display_name", pattern).limit(20),
      client.from("app_user").select("id, display_name, email, role, created_at").eq("tenant_id", tenantId).ilike("email", pattern).limit(20),
    ]);
    if (byName.error) throw byName.error;
    if (byEmail.error) throw byEmail.error;
    const users = new Map<string, UserRow>();
    for (const row of [...(byName.data ?? []), ...(byEmail.data ?? [])]) {
      users.set(row.id, {
        id: row.id,
        display_name: row.display_name,
        email: row.email,
        role: row.role,
        created_at: row.created_at,
      });
    }
    return rankSearchResults(
      [...users.values()].map((row) => ({
        id: row.id,
        type: "user" as const,
        title: row.display_name?.trim() || row.email,
        subtitle: ROLE_LABEL[row.role] ?? row.role,
        metadata: row.email,
        href: "/ajustes/usuarios",
        updatedAt: row.created_at,
      })),
      query,
    );
  },
};

