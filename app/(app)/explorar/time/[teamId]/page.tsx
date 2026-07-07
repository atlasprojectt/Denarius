import Link from "next/link";
import { notFound } from "next/navigation";

import { SimulateDrawer } from "@/app/(app)/_components/simulate-drawer";
import { requireAdmin } from "@/lib/auth/session";
import { currentPeriod } from "@/lib/engine/period";
import { getHomeData } from "@/lib/home/queries";
import { money } from "@/lib/money";
import { teamDetail } from "@/lib/usage/attribution";

const copy = {
  back: "← Explorar",
  adminOnly: "Somente administradores podem ver o custo por pessoa.",
  asOf: (label: string, day: number, days: number) =>
    `${label}, dia ${day} de ${days}`,
  personTitle: "Custo por pessoa",
  personSub:
    "Contribuintes deste time neste mês. Chaves compartilhadas ficam no time, nunca em uma pessoa.",
  empty:
    "Nenhum uso de API atribuído a este time ainda. Mapeie um projeto ou workspace em Ajustes → Atribuição.",
  colPerson: "Pessoa / chave",
  colTokens: "Tokens",
  colDerived: "Gasto derivado",
  sharedKey: "Chave compartilhada",
  uncosted: "não precificado",
  total: "Total do time",
  uncostedNote:
    "Modelos sem preço aparecem como “não precificado” em vez de sumir do total. Valores em US$.",
};

const compactTokens = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  // Per-person cost is names/ids in context — Admin-only (product principle #1).
  const auth = await requireAdmin();
  if (auth.error !== undefined) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Back />
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          {copy.adminOnly}
        </p>
      </div>
    );
  }

  const [detail, { cockpit }] = await Promise.all([
    teamDetail(teamId),
    getHomeData(),
  ]);
  if (!detail.found) notFound();

  const period = currentPeriod();

  // [Simular] in context (#21): pre-loaded with this team's budget evaluation.
  // Only budgeted teams have a scenario to run against.
  const cockpitTeam =
    cockpit.state === "ready"
      ? [...cockpit.needsAttention, ...cockpit.underControl].find(
          (t) => t.teamId === teamId,
        )
      : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Back />
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {detail.teamName}
          </h1>
          <p className="text-sm text-muted-foreground">{copy.personSub}</p>
        </div>
        {cockpit.state === "ready" && cockpitTeam && (
          <SimulateDrawer
            teamName={cockpitTeam.teamName}
            currency={cockpit.currency}
            team={{
              spent: cockpitTeam.evaluation.spent,
              projection: cockpitTeam.evaluation.projection,
              budget: cockpitTeam.evaluation.budget,
            }}
            org={{
              projection: cockpit.org.projection,
              budget: cockpit.org.budget,
            }}
          />
        )}
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-semibold">{copy.personTitle}</h2>
          <span className="text-xs text-muted-foreground">
            {copy.asOf(period.monthLabel, period.dayOfPeriod, period.daysInPeriod)}
          </span>
        </div>

        {detail.persons.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{copy.empty}</p>
        ) : (
          <>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">{copy.colPerson}</th>
                  <th className="py-2 pr-2 text-right font-medium">
                    {copy.colTokens}
                  </th>
                  <th className="py-2 pr-2 text-right font-medium">
                    {copy.colDerived}
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.persons.map((person) => (
                  <tr
                    key={person.userId || "__shared__"}
                    className="border-b last:border-b-0"
                  >
                    <td className="py-2.5 pr-2 font-medium">
                      {person.isShared ? (
                        <span className="text-muted-foreground">
                          {copy.sharedKey}
                        </span>
                      ) : (
                        person.userId
                      )}
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">
                      {compactTokens.format(
                        person.inputTokens + person.outputTokens,
                      )}
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">
                      {person.uncosted && person.derivedUsd === 0 ? (
                        <span className="text-muted-foreground">
                          {copy.uncosted}
                        </span>
                      ) : (
                        money(person.derivedUsd, "USD")
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="border-t font-medium">
                  <td className="py-2.5 pr-2">{copy.total}</td>
                  <td />
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {money(detail.totalUsd, "USD")}
                  </td>
                </tr>
              </tbody>
            </table>
            {detail.hasUncosted && (
              <p className="mt-3 text-xs text-muted-foreground">
                {copy.uncostedNote}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Back() {
  return (
    <Link href="/explorar" className="text-sm text-muted-foreground hover:underline">
      {copy.back}
    </Link>
  );
}
