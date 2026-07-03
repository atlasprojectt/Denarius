import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const copy = {
  title: "Ajustes",
  subtitle: "Conexões, identidade e privacidade",
  companyTitle: "Empresa",
  companyName: "Nome",
  companyCurrency: "Moeda de exibição",
  connectionsTitle: "Conexões",
  connectionsSub:
    "Chaves admin somente-leitura, criptografadas — o Denarius nunca altera nada nos provedores.",
  connections: [
    { name: "OpenAI", status: "Chega na issue #15" },
    { name: "Anthropic", status: "Chega na issue #16" },
    { name: "GitHub Copilot", status: "Planejado para a v1.5" },
  ],
  rosterTitle: "Roster",
  rosterEmpty: "Nenhum funcionário importado ainda.",
  rosterCount: (people: number, teams: number) =>
    `${people} pessoa(s) em ${teams} time(s).`,
  rosterCta: "Gerenciar roster",
  seatsTitle: "Assinaturas e assentos",
  seatsEmpty: "Nenhuma assinatura registrada ainda.",
  seatsCount: (subs: number) =>
    `${subs} assinatura(s) — custo distribuído dia a dia no período.`,
  seatsCta: "Gerenciar assinaturas",
  privacyTitle: "Privacidade",
  privacyBody:
    "Nomes visíveis somente para Admin e minimização de dados por pessoa chegam na issue #23. Prompts e respostas nunca são armazenados — somente metadados de uso.",
};

type TenantRow = { name: string; display_currency: string };

export default async function SettingsPage() {
  const supabase = await createClient();
  const [
    { data },
    { count: employeeCount },
    { count: teamCount },
    { count: subscriptionCount },
  ] = await Promise.all([
    supabase.from("tenant").select("name, display_currency").maybeSingle(),
    supabase.from("employee").select("id", { count: "exact", head: true }),
    supabase
      .from("team")
      .select("id", { count: "exact", head: true })
      .eq("is_unattributed", false),
    supabase.from("subscription").select("id", { count: "exact", head: true }),
  ]);
  const tenant = data as TenantRow | null;
  if (!tenant) redirect("/onboarding");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-semibold">{copy.companyTitle}</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <dt className="text-muted-foreground">{copy.companyName}</dt>
            <dd className="font-medium">{tenant.name}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{copy.companyCurrency}</dt>
            <dd className="font-medium">{tenant.display_currency}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-semibold">{copy.connectionsTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {copy.connectionsSub}
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {copy.connections.map((connection) => (
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
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted whitespace-nowrap"
          >
            {copy.seatsCta}
          </Link>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-semibold">{copy.privacyTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.privacyBody}</p>
      </section>
    </div>
  );
}
