import Link from "next/link";
import { redirect } from "next/navigation";

import { monthStartUtc } from "@/lib/engine/period";
import { canEditCompanySettings } from "@/lib/settings/account";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "./_components/company-form";
import { CurrencyForm } from "./_components/currency-form";
import { PrivacyForm } from "./_components/privacy-form";
import { UsersTable, type TenantUser } from "./_components/users-table";

const copy = {
  title: "Ajustes",
  subtitle: "Empresa, conexões e governança operacional.",
  companyTitle: "Empresa",
  companySub:
    "Identidade da empresa usada no topo do app e nas superfícies de governança.",
  connectionsTitle: "Conexões",
  connectionsSub:
    "Chaves admin somente-leitura, criptografadas. O Denarius nunca altera nada nos provedores.",
  connectionsCta: "Gerenciar conexões",
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
  staticConnections: [
    { name: "GitHub Copilot", status: "Planejado para a v1.5" },
  ],
  attributionTitle: "Atribuição",
  attributionSub:
    "Mapeie projetos e workspaces dos provedores para os times. O que não for mapeado cai em Não atribuído.",
  attributionCta: "Gerenciar atribuição",
  rosterTitle: "Roster",
  rosterEmpty: "Nenhum funcionário importado ainda.",
  rosterCount: (people: number, teams: number) =>
    `${people} pessoa(s) em ${teams} time(s).`,
  rosterCta: "Gerenciar roster",
  seatsTitle: "Assinaturas e assentos",
  seatsEmpty: "Nenhuma assinatura registrada ainda.",
  seatsCount: (subs: number) =>
    `${subs} assinatura(s). Custo distribuído dia a dia no período.`,
  seatsCta: "Gerenciar assinaturas",
  budgetsTitle: "Orçamentos",
  budgetsSet: (org: boolean, teams: number) =>
    org
      ? `Orçamento da empresa definido${teams > 0 ? ` e ${teams} time(s)` : ""}.`
      : teams > 0
        ? `${teams} time(s) com orçamento. Falta o da empresa.`
        : "Nenhum orçamento definido ainda. Sem orçamento não há veredito.",
  budgetsCta: "Gerenciar orçamentos",
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
  const statusFor = (provider: string) =>
    connections.find((c) => c.provider === provider)?.status ?? "none";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="font-semibold">{copy.companyTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.companySub}</p>
        </div>

        <div className="mt-4">
          <CompanyForm companyName={tenant.name} isAdmin={isAdmin} />
        </div>

        <div className="mt-4">
          <CurrencyForm
            currency={tenant.display_currency}
            editable={currencyEditable}
          />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">{copy.connectionsTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.connectionsSub}
            </p>
          </div>
          <Link
            href="/ajustes/conexoes"
            className="whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            {copy.connectionsCta}
          </Link>
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          {(["openai", "anthropic"] as const).map((provider) => (
            <li
              key={provider}
              className="flex items-center justify-between rounded-lg border p-3 text-sm"
            >
              <span className="font-medium">{copy.providerNames[provider]}</span>
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {copy.providerStatus[statusFor(provider)] ??
                  copy.providerStatus.none}
              </span>
            </li>
          ))}
          {copy.staticConnections.map((connection) => (
            <li
              key={connection.name}
              className="flex items-center justify-between rounded-lg border p-3 text-sm"
            >
              <span className="font-medium">{connection.name}</span>
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {connection.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">{copy.attributionTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.attributionSub}
            </p>
          </div>
          <Link
            href="/ajustes/atribuicao"
            className="whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            {copy.attributionCta}
          </Link>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">{copy.rosterTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {employeeCount
                ? copy.rosterCount(employeeCount, teamCount ?? 0)
                : copy.rosterEmpty}
            </p>
          </div>
          <Link
            href="/ajustes/roster"
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            {copy.rosterCta}
          </Link>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">{copy.seatsTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {subscriptionCount
                ? copy.seatsCount(subscriptionCount)
                : copy.seatsEmpty}
            </p>
          </div>
          <Link
            href="/ajustes/assinaturas"
            className="whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            {copy.seatsCta}
          </Link>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">{copy.budgetsTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.budgetsSet(hasOrgBudget, teamBudgetCount)}
            </p>
          </div>
          <Link
            href="/ajustes/orcamentos"
            className="whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            {copy.budgetsCta}
          </Link>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="font-semibold">{copy.privacyTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.privacySub}</p>
        </div>
        <div className="mt-4">
          <PrivacyForm
            showNames={tenant.show_names}
            storePerPerson={tenant.store_per_person}
            isAdmin={isAdmin}
          />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="font-semibold">{copy.usersTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.usersSub}</p>
        </div>
        <div className="mt-4">
          <UsersTable
            users={users}
            currentUserId={user?.id ?? ""}
            isAdmin={isAdmin}
          />
        </div>
      </section>
    </div>
  );
}
