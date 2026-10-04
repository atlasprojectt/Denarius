import { normalizeSearchText, rankSearchResults } from "./ranking";
import type { SearchResult } from "./types";

export const SEARCH_SCOPES = [
  { label: "Times", query: "times", href: "/times" },
  { label: "Relatórios", query: "relatórios", href: "/relatorios" },
  { label: "Assinaturas", query: "assinaturas", href: "/ajustes/assinaturas" },
  { label: "Conexões", query: "conexões", href: "/ajustes/conexoes" },
] as const;

type RouteDefinition = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  aliases: string[];
  adminOnly?: boolean;
};

const ROUTES: RouteDefinition[] = [
  { id: "home", title: "Início", subtitle: "Cockpit", href: "/", aliases: ["home", "cockpit"] },
  { id: "teams", title: "Times", subtitle: "Cockpit", href: "/times", aliases: ["equipe"] },
  { id: "explore", title: "Composição", subtitle: "Modelos de IA e custos fixos", href: "/explorar", aliases: ["explorar", "modelos", "custos"] },
  { id: "reports", title: "Relatórios", subtitle: "Fechamentos mensais", href: "/relatorios", aliases: ["relatorio", "fechamento"] },
  { id: "settings", title: "Ajustes", subtitle: "Configurações do espaço", href: "/ajustes", aliases: ["configurações", "configuracoes", "settings"] },
  { id: "company", title: "Empresa e moeda", subtitle: "Identidade da empresa", href: "/ajustes/empresa", aliases: ["empresa", "moeda"] },
  { id: "roster", title: "Pessoas e times", subtitle: "Funcionários e roster", href: "/ajustes/roster", aliases: ["pessoas", "funcionarios", "funcionário", "roster"] },
  { id: "users", title: "Acessos e usuários", subtitle: "Pessoas com acesso ao Denarius", href: "/ajustes/usuarios", aliases: ["usuarios", "usuários", "acessos", "acesso"], adminOnly: true },
  { id: "connections", title: "Conexões", subtitle: "OpenAI e Anthropic", href: "/ajustes/conexoes", aliases: ["provedores", "chaves"], adminOnly: true },
  { id: "subscriptions", title: "Assinaturas", subtitle: "Custos fixos e licenças", href: "/ajustes/assinaturas", aliases: ["licenças", "licencas"], adminOnly: true },
  { id: "budgets", title: "Orçamentos", subtitle: "Limites mensais", href: "/ajustes/orcamentos", aliases: ["orcamento", "budget"] },
  { id: "attribution", title: "Atribuição", subtitle: "Projetos e workspaces por time", href: "/ajustes/atribuicao", aliases: ["atribuir", "projetos", "workspaces"], adminOnly: true },
  { id: "privacy", title: "Privacidade", subtitle: "Nomes e dados por pessoa", href: "/ajustes/privacidade", aliases: ["dados", "lgpd"] },
  { id: "audit", title: "Auditoria", subtitle: "Histórico administrativo", href: "/ajustes/auditoria", aliases: ["log"], adminOnly: true },
  { id: "preferences", title: "Preferências", subtitle: "Sua conta e aparência", href: "/preferencias", aliases: ["perfil", "tema"] },
];

export const routesSearchProvider = {
  type: "route" as const,
  label: "Rotas e áreas",
  async search({ role }: { role: string }, query: string): Promise<SearchResult[]> {
    const normalizedQuery = normalizeSearchText(query);
    const results = ROUTES
      .filter((route) => !route.adminOnly || role === "admin")
      .filter((route) =>
        normalizeSearchText([route.title, route.subtitle, ...route.aliases].join(" ")).includes(normalizedQuery),
      )
      .map((route) => ({
        id: route.id,
        type: "route" as const,
        title: route.title,
        subtitle: route.subtitle,
        href: route.href,
      }));
    return rankSearchResults(results, query);
  },
};

