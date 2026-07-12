import Link from "next/link";
import { redirect } from "next/navigation";
import {
  RiBuildingLine,
  RiPieChartLine,
  RiArrowRightSLine,
  RiCoinsLine,
  RiPlugLine,
  RiShieldKeyholeLine,
  RiUserSettingsLine,
  RiTeamLine,
  RiWallet3Line,
} from "@remixicon/react";

import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { monthStartUtc } from "@/lib/engine/period";
import { createClient } from "@/lib/supabase/server";

const copy = {
  title: "Ajustes",
  subtitle: "Empresa, fontes de gasto e governança operacional.",
  groupCompany: "Empresa",
  groupSources: "Fontes de gasto",
  groupGovernance: "Governança",
  companyTitle: "Empresa e moeda",
  companySub: (name: string, currency: string) => `${name} · Valores exibidos em ${currency}.`,
  connectionsTitle: "Conexões",
  connectionsNone: "Nenhum provedor conectado ainda.",
  providerNames: { openai: "OpenAI", anthropic: "Anthropic" } as Record<string, string>,
  providerStatus: {
    active: "Ativo",
    error: "Erro na sincronização",
    revoked: "Revogado",
    none: "Não conectado",
  } as Record<string, string>,
  attributionTitle: "Atribuição",
  attributionSub: "Mapeie projetos e workspaces para times.",
  rosterTitle: "Roster",
  rosterEmpty: "Nenhuma pessoa importada ainda.",
  rosterCount: (people: number, teams: number) => `${people} pessoa(s) em ${teams} time(s).`,
  seatsTitle: "Assinaturas e assentos",
  seatsEmpty: "Nenhuma assinatura registrada ainda.",
  seatsCount: (subs: number) => `${subs} assinatura(s) registrada(s).`,
  budgetsTitle: "Orçamentos",
  budgetsSet: (org: boolean, teams: number) =>
    org
      ? `Empresa definida${teams > 0 ? ` · ${teams} time(s)` : ""}.`
      : teams > 0
        ? `${teams} time(s) definidos · falta a empresa.`
        : "Nenhum orçamento definido ainda.",
  privacyTitle: "Privacidade",
  privacySub: "Visibilidade de nomes e minimização de dados por pessoa.",
  usersTitle: "Usuários",
  usersSub: (count: number) => `${count} usuário(s) com acesso a este espaço.`,
};

type TenantRow = { name: string; display_currency: string };

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

function SettingsLink({
  href,
  icon,
  title,
  description,
  status,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  status?: React.ReactNode;
}) {
  return (
    <Item asChild>
      <Link href={href} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
        <ItemMedia variant="icon" className="text-muted-foreground">{icon}</ItemMedia>
        <ItemContent>
          <ItemTitle>{title}</ItemTitle>
          <ItemDescription>{description}</ItemDescription>
        </ItemContent>
        <ItemActions>
          {status}
          <RiArrowRightSLine className="size-4 text-muted-foreground" aria-hidden />
        </ItemActions>
      </Link>
    </Item>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <GroupLabel>{title}</GroupLabel>
      <Card size="sm" className="py-2">
        <CardContent className="px-2">
          <ItemGroup className="gap-0">{children}</ItemGroup>
        </CardContent>
      </Card>
    </section>
  );
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
    supabase.from("tenant").select("name, display_currency").maybeSingle(),
    supabase.from("employee").select("id", { count: "exact", head: true }),
    supabase.from("team").select("id", { count: "exact", head: true }).eq("is_unattributed", false),
    supabase.from("subscription").select("id", { count: "exact", head: true }),
    supabase.from("app_user").select("id", { count: "exact", head: true }),
    supabase.from("provider_connection").select("provider, status"),
    supabase.from("budget").select("scope").eq("period_month", period),
  ]);
  const tenant = tenantData as TenantRow | null;
  if (!tenant) redirect("/onboarding");

  const budgets = (budgetData ?? []) as { scope: string }[];
  const hasOrgBudget = budgets.some((budget) => budget.scope === "org");
  const teamBudgetCount = budgets.filter((budget) => budget.scope === "team").length;
  const connections = (connectionData ?? []) as { provider: string; status: string }[];
  const activeCount = connections.filter((connection) => connection.status === "active").length;
  const connectionSummary =
    connections.length === 0
      ? copy.connectionsNone
      : connections
          .map((connection) =>
            `${copy.providerNames[connection.provider] ?? connection.provider}: ${copy.providerStatus[connection.status] ?? connection.status}`,
          )
          .join(" · ");

  return (
    <PageContainer className="gap-8">
      <PageHeader title={copy.title} description={copy.subtitle} />

      <SettingsGroup title={copy.groupCompany}>
        <SettingsLink
          href="/ajustes/empresa"
          icon={<RiBuildingLine />}
          title={copy.companyTitle}
          description={copy.companySub(tenant.name, tenant.display_currency)}
        />
      </SettingsGroup>

      <SettingsGroup title={copy.groupSources}>
        <SettingsLink
          href="/ajustes/conexoes"
          icon={<RiPlugLine />}
          title={copy.connectionsTitle}
          description={connectionSummary}
          status={activeCount > 0 ? <Badge variant="secondary">{activeCount} ativa(s)</Badge> : undefined}
        />
        <ItemSeparator className="my-0" />
        <SettingsLink href="/ajustes/atribuicao" icon={<RiPieChartLine />} title={copy.attributionTitle} description={copy.attributionSub} />
        <ItemSeparator className="my-0" />
        <SettingsLink
          href="/ajustes/roster"
          icon={<RiTeamLine />}
          title={copy.rosterTitle}
          description={employeeCount ? copy.rosterCount(employeeCount, teamCount ?? 0) : copy.rosterEmpty}
        />
        <ItemSeparator className="my-0" />
        <SettingsLink
          href="/ajustes/assinaturas"
          icon={<RiCoinsLine />}
          title={copy.seatsTitle}
          description={subscriptionCount ? copy.seatsCount(subscriptionCount) : copy.seatsEmpty}
        />
      </SettingsGroup>

      <SettingsGroup title={copy.groupGovernance}>
        <SettingsLink
          href="/ajustes/orcamentos"
          icon={<RiWallet3Line />}
          title={copy.budgetsTitle}
          description={copy.budgetsSet(hasOrgBudget, teamBudgetCount)}
        />
        <ItemSeparator className="my-0" />
        <SettingsLink href="/ajustes/privacidade" icon={<RiShieldKeyholeLine />} title={copy.privacyTitle} description={copy.privacySub} />
        <ItemSeparator className="my-0" />
        <SettingsLink href="/ajustes/usuarios" icon={<RiUserSettingsLine />} title={copy.usersTitle} description={copy.usersSub(userCount ?? 0)} />
      </SettingsGroup>
    </PageContainer>
  );
}
