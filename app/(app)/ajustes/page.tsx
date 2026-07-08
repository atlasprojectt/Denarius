import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconChevronRight,
  IconChartPie,
  IconCoins,
  IconPlug,
  IconUsersGroup,
  IconWallet,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { monthStartUtc } from "@/lib/engine/period";
import { canEditCompanySettings } from "@/lib/settings/account";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "./_components/company-form";
import { CurrencyForm } from "./_components/currency-form";
import { PrivacyForm } from "./_components/privacy-form";
import { UsersTable, type TenantUser } from "./_components/users-table";

const copy = {
  title: "Ajustes",
  subtitle: "Empresa, fontes de gasto e governança operacional.",
  groupCompany: "Empresa",
  groupSources: "Fontes de gasto",
  groupGovernance: "Governança",
  companyTitle: "Identidade",
  companySub:
    "Nome usado no topo do app e nas superfícies de governança, e a moeda em que os valores aparecem.",
  connectionsTitle: "Conexões",
  connectionsSub:
    "Chaves admin somente-leitura, criptografadas. O Denarius nunca altera nada nos provedores.",
  providerNames: { openai: "OpenAI", anthropic: "Anthropic" } as Record<
    string,
    string
  >,
  providerStatus: {
    active: "Ativo",
    error: "Erro na sincronização",
    revoked: "Revogado",
    none: "Não conectado",
  } as Record<string, string>,
  connectionsNone: "Nenhum provedor conectado ainda.",
  attributionTitle: "Atribuição",
  attributionSub:
    "Mapeie projetos e workspaces dos provedores para os times. O que não for mapeado cai em Não atribuído.",
  rosterTitle: "Roster",
  rosterEmpty: "Nenhum funcionário importado ainda.",
  rosterCount: (people: number, teams: number) =>
    `${people} pessoa(s) em ${teams} time(s).`,
  seatsTitle: "Assinaturas e assentos",
  seatsEmpty: "Nenhuma assinatura registrada ainda.",
  seatsCount: (subs: number) =>
    `${subs} assinatura(s). Custo distribuído dia a dia no período.`,
  budgetsTitle: "Orçamentos",
  budgetsSet: (org: boolean, teams: number) =>
    org
      ? `Orçamento da empresa definido${teams > 0 ? ` e ${teams} time(s)` : ""}.`
      : teams > 0
        ? `${teams} time(s) com orçamento. Falta o da empresa.`
        : "Nenhum orçamento definido ainda. Sem orçamento não há veredito.",
  privacyTitle: "Privacidade",
  privacySub:
    "Controles de confiança: quem vê nomes, minimização de dados por pessoa (LGPD).",
  usersTitle: "Usuários",
  usersSub:
    "Quem tem acesso a este espaço. Remover revoga o acesso imediatamente.",
};

type TenantRow = {
  name: string;
  display_currency: string;
  show_names: boolean;
  store_per_person: boolean;
};
type AppUserRow = { role: string };

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
      <Link href={href}>
        <ItemMedia variant="icon" className="text-muted-foreground">
          {icon}
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{title}</ItemTitle>
          <ItemDescription>{description}</ItemDescription>
        </ItemContent>
        <ItemActions>
          {status}
          <IconChevronRight className="size-4 text-muted-foreground" aria-hidden />
        </ItemActions>
      </Link>
    </Item>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const period = monthStartUtc();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: userData },
    { data },
    { count: employeeCount },
    { count: teamCount },
    { count: subscriptionCount },
    { count: budgetTotalCount },
    { data: connectionData },
    { data: budgetData },
    { data: usersData },
  ] = await Promise.all([
    user
      ? supabase.from("app_user").select("role").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("tenant")
      .select("name, display_currency, show_names, store_per_person")
      .maybeSingle(),
    supabase.from("employee").select("id", { count: "exact", head: true }),
    supabase
      .from("team")
      .select("id", { count: "exact", head: true })
      .eq("is_unattributed", false),
    supabase.from("subscription").select("id", { count: "exact", head: true }),
    supabase.from("budget").select("id", { count: "exact", head: true }),
    supabase.from("provider_connection").select("provider, status"),
    supabase.from("budget").select("scope").eq("period_month", period),
    supabase.from("app_user").select("id, email, role").order("email"),
  ]);
  const tenant = data as TenantRow | null;
  if (!tenant) redirect("/onboarding");

  const appUser = userData as AppUserRow | null;
  const isAdmin = canEditCompanySettings(appUser?.role ?? "viewer");
  const budgets = (budgetData ?? []) as { scope: string }[];
  const hasOrgBudget = budgets.some((b) => b.scope === "org");
  const teamBudgetCount = budgets.filter((b) => b.scope === "team").length;
  const users = (usersData ?? []) as TenantUser[];
  // Day-zero: currency is safe to change only before anything is denominated
  // in it (frozen-FX budgets / seat costs). Mirrors the server-action guard.
  const currencyEditable =
    isAdmin && (budgetTotalCount ?? 0) === 0 && (subscriptionCount ?? 0) === 0;
  const connections = (connectionData ?? []) as {
    provider: string;
    status: string;
  }[];
  const connected = connections.filter((c) => c.status === "active");
  const connectionsSummary =
    connections.length === 0
      ? copy.connectionsNone
      : connections
          .map(
            (c) =>
              `${copy.providerNames[c.provider] ?? c.provider}: ${
                copy.providerStatus[c.status] ?? c.status
              }`,
          )
          .join(" · ");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <PageHeader title={copy.title} description={copy.subtitle} />

      <section className="flex flex-col gap-3">
        <GroupLabel>{copy.groupCompany}</GroupLabel>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{copy.companyTitle}</CardTitle>
            <CardDescription>{copy.companySub}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <CompanyForm companyName={tenant.name} isAdmin={isAdmin} />
            <Separator />
            <CurrencyForm
              currency={tenant.display_currency}
              editable={currencyEditable}
            />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <GroupLabel>{copy.groupSources}</GroupLabel>
        <Card size="sm" className="py-2">
          <CardContent className="px-2">
            <ItemGroup className="gap-0">
              <SettingsLink
                href="/ajustes/conexoes"
                icon={<IconPlug />}
                title={copy.connectionsTitle}
                description={connectionsSummary}
                status={
                  connected.length > 0 ? (
                    <Badge variant="secondary" className="tabular-nums">
                      {connected.length} ativa(s)
                    </Badge>
                  ) : undefined
                }
              />
              <ItemSeparator className="my-0" />
              <SettingsLink
                href="/ajustes/atribuicao"
                icon={<IconChartPie />}
                title={copy.attributionTitle}
                description={copy.attributionSub}
              />
              <ItemSeparator className="my-0" />
              <SettingsLink
                href="/ajustes/roster"
                icon={<IconUsersGroup />}
                title={copy.rosterTitle}
                description={
                  employeeCount
                    ? copy.rosterCount(employeeCount, teamCount ?? 0)
                    : copy.rosterEmpty
                }
              />
              <ItemSeparator className="my-0" />
              <SettingsLink
                href="/ajustes/assinaturas"
                icon={<IconCoins />}
                title={copy.seatsTitle}
                description={
                  subscriptionCount
                    ? copy.seatsCount(subscriptionCount)
                    : copy.seatsEmpty
                }
              />
            </ItemGroup>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <GroupLabel>{copy.groupGovernance}</GroupLabel>
        <Card size="sm" className="py-2">
          <CardContent className="px-2">
            <SettingsLink
              href="/ajustes/orcamentos"
              icon={<IconWallet />}
              title={copy.budgetsTitle}
              description={copy.budgetsSet(hasOrgBudget, teamBudgetCount)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{copy.privacyTitle}</CardTitle>
            <CardDescription>{copy.privacySub}</CardDescription>
          </CardHeader>
          <CardContent>
            <PrivacyForm
              showNames={tenant.show_names}
              storePerPerson={tenant.store_per_person}
              isAdmin={isAdmin}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{copy.usersTitle}</CardTitle>
            <CardDescription>{copy.usersSub}</CardDescription>
          </CardHeader>
          <CardContent>
            <UsersTable
              users={users}
              currentUserId={user?.id ?? ""}
              isAdmin={isAdmin}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
