import { redirect } from "next/navigation";
import {
  RiBuildingLine,
  RiCoinsLine,
  RiPieChartLine,
  RiPlugLine,
  RiShieldKeyholeLine,
  RiTeamLine,
  RiUserSettingsLine,
  RiWallet3Line,
} from "@remixicon/react";

import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { monthStartUtc } from "@/lib/engine/period";
import { counted } from "@/lib/plural";
import { createClient } from "@/lib/supabase/server";
import {
  SettingsItemStatus,
  SettingsNavigationItem,
  SettingsSection,
} from "./_components/settings-navigation";

const copy = {
  title: "Ajustes",
  subtitle:
    "Gerencie a empresa, as fontes de gasto, os acessos e as regras de governança.",
  groupCompany: "Empresa",
  groupSources: "Fontes de gasto",
  groupGovernance: "Governança",
  companyTitle: "Empresa e moeda",
  companyDescription:
    "Configure os dados da empresa e a moeda de exibição.",
  connectionsTitle: "Conexões",
  connectionsDescription: "Gerencie as integrações com provedores.",
  connectionHealthy: (count: number) =>
    counted(count, "conexão ativa", "conexões ativas"),
  connectionAttention: (count: number) =>
    counted(count, "requer atenção", "requerem atenção"),
  attributionTitle: "Atribuição",
  attributionDescription: "Associe projetos e workspaces aos times.",
  rosterTitle: "Roster",
  rosterDescription: "Gerencie as pessoas e seus respectivos times.",
  people: (count: number) => counted(count, "pessoa", "pessoas"),
  teams: (count: number) => counted(count, "time", "times"),
  seatsTitle: "Assinaturas e assentos",
  seatsDescription: "Gerencie ferramentas, preços e responsáveis.",
  subscriptions: (count: number) =>
    counted(count, "assinatura", "assinaturas"),
  budgetsTitle: "Orçamentos",
  budgetsDescription: "Defina limites para a empresa e para os times.",
  companyBudget: "Empresa",
  companyPending: "empresa pendente",
  budgetNone: "Não definido",
  privacyTitle: "Privacidade",
  privacyDescription: "Controle nomes, permissões e retenção de dados.",
  usersTitle: "Usuários",
  usersDescription: "Gerencie quem pode acessar este espaço.",
  users: (count: number) => counted(count, "usuário", "usuários"),
};

type TenantRow = { display_currency: string };
type ConnectionRow = { status: string };

function budgetSummary(hasOrgBudget: boolean, teamBudgetCount: number): string {
  if (hasOrgBudget && teamBudgetCount > 0) {
    return `${copy.companyBudget} + ${copy.teams(teamBudgetCount)}`;
  }
  if (hasOrgBudget) return copy.companyBudget;
  if (teamBudgetCount > 0) {
    return `${copy.teams(teamBudgetCount)} · ${copy.companyPending}`;
  }
  return copy.budgetNone;
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const period = monthStartUtc();
  const [
    { data: tenantData },
    { count: employeeCount },
    { count: teamCount },
    { count: subscriptionCount },
    { count: userCount },
    { data: connectionData },
    { data: budgetData },
  ] = await Promise.all([
    supabase.from("tenant").select("display_currency").maybeSingle(),
    supabase.from("employee").select("id", { count: "exact", head: true }),
    supabase
      .from("team")
      .select("id", { count: "exact", head: true })
      .eq("is_unattributed", false),
    supabase
      .from("subscription")
      .select("id", { count: "exact", head: true }),
    supabase.from("app_user").select("id", { count: "exact", head: true }),
    supabase.from("provider_connection").select("status"),
    supabase.from("budget").select("scope").eq("period_month", period),
  ]);
  const tenant = tenantData as TenantRow | null;
  if (!tenant) redirect("/onboarding");

  const budgets = (budgetData ?? []) as { scope: string }[];
  const hasOrgBudget = budgets.some((budget) => budget.scope === "org");
  const teamBudgetCount = budgets.filter(
    (budget) => budget.scope === "team",
  ).length;
  const connections = (connectionData ?? []) as ConnectionRow[];
  const activeCount = connections.filter(
    (connection) => connection.status === "active",
  ).length;
  const attentionCount = connections.length - activeCount;
  const connectionMeta =
    attentionCount > 0
      ? copy.connectionAttention(attentionCount)
      : copy.connectionHealthy(activeCount);

  return (
    <PageContainer variant="settings" className="gap-8">
      <PageHeader title={copy.title} description={copy.subtitle} />

      <div className="flex flex-col gap-7">
        <SettingsSection id="settings-company" title={copy.groupCompany}>
          <SettingsNavigationItem
            href="/ajustes/empresa"
            icon={<RiBuildingLine />}
            title={copy.companyTitle}
            description={copy.companyDescription}
            meta={
              <SettingsItemStatus>
                {tenant.display_currency}
              </SettingsItemStatus>
            }
          />
        </SettingsSection>

        <SettingsSection id="settings-sources" title={copy.groupSources}>
          <SettingsNavigationItem
            href="/ajustes/conexoes"
            icon={<RiPlugLine />}
            title={copy.connectionsTitle}
            description={copy.connectionsDescription}
            meta={
              <SettingsItemStatus indicator={connections.length > 0}>
                {connectionMeta}
              </SettingsItemStatus>
            }
          />
          <SettingsNavigationItem
            href="/ajustes/atribuicao"
            icon={<RiPieChartLine />}
            title={copy.attributionTitle}
            description={copy.attributionDescription}
          />
          <SettingsNavigationItem
            href="/ajustes/roster"
            icon={<RiTeamLine />}
            title={copy.rosterTitle}
            description={copy.rosterDescription}
            meta={
              <SettingsItemStatus>
                {copy.people(employeeCount ?? 0)} · {copy.teams(teamCount ?? 0)}
              </SettingsItemStatus>
            }
          />
          <SettingsNavigationItem
            href="/ajustes/assinaturas"
            icon={<RiCoinsLine />}
            title={copy.seatsTitle}
            description={copy.seatsDescription}
            meta={
              <SettingsItemStatus>
                {copy.subscriptions(subscriptionCount ?? 0)}
              </SettingsItemStatus>
            }
          />
        </SettingsSection>

        <SettingsSection id="settings-governance" title={copy.groupGovernance}>
          <SettingsNavigationItem
            href="/ajustes/orcamentos"
            icon={<RiWallet3Line />}
            title={copy.budgetsTitle}
            description={copy.budgetsDescription}
            meta={
              <SettingsItemStatus>
                {budgetSummary(hasOrgBudget, teamBudgetCount)}
              </SettingsItemStatus>
            }
          />
          <SettingsNavigationItem
            href="/ajustes/privacidade"
            icon={<RiShieldKeyholeLine />}
            title={copy.privacyTitle}
            description={copy.privacyDescription}
          />
          <SettingsNavigationItem
            href="/ajustes/usuarios"
            icon={<RiUserSettingsLine />}
            title={copy.usersTitle}
            description={copy.usersDescription}
            meta={
              <SettingsItemStatus>
                {copy.users(userCount ?? 0)}
              </SettingsItemStatus>
            }
          />
        </SettingsSection>
      </div>
    </PageContainer>
  );
}
