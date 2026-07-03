import Link from "next/link";

import { attributeSeats } from "@/lib/engine/accrual";
import { currentPeriod } from "@/lib/engine/period";
import { money } from "@/lib/money";
import { listSubscriptions } from "@/lib/subscriptions/queries";

const copy = {
  title: "Explorar",
  subtitle: "Atribuição e investigação por time, pessoa e modelo",
  asOf: (label: string, day: number, days: number) =>
    `${label}, dia ${day} de ${days}`,
  emptyTitle: "Sem dados para explorar ainda",
  emptyBody:
    "Registre assinaturas e assentos para ver o gasto atribuído por time — sem precisar conectar nenhuma API. Conectores de uso (OpenAI, Anthropic) chegam nas próximas issues.",
  emptyCta: "Adicionar assinaturas",
  tableTitle: "Gasto por time",
  colTeam: "Time",
  colSpend: "Gasto (acumulado)",
  unattributed: "Não atribuído",
  mapIt: "mapear",
  reconcile: (total: string) =>
    `Total da empresa = soma dos times + não atribuído = ${total} — sempre reconcilia.`,
  seatsNote:
    "Somente assinaturas manuais por enquanto — o gasto por modelo aparece quando um conector de uso for ligado.",
};

export default async function ExplorePage() {
  const period = currentPeriod();
  const { subscriptions, currency } = await listSubscriptions();
  const breakdown = attributeSeats(subscriptions, period);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card p-12 text-center">
          <p className="font-medium">{copy.emptyTitle}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {copy.emptyBody}
          </p>
          <Link
            href="/ajustes/assinaturas"
            className="mt-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {copy.emptyCta}
          </Link>
        </div>
      ) : (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-semibold">{copy.tableTitle}</h2>
            <span className="text-xs text-muted-foreground">
              {copy.asOf(
                period.monthLabel,
                period.dayOfPeriod,
                period.daysInPeriod,
              )}
            </span>
          </div>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2 font-medium">{copy.colTeam}</th>
                <th className="py-2 pr-2 text-right font-medium">
                  {copy.colSpend}
                </th>
              </tr>
            </thead>
            <tbody>
              {breakdown.teams.map((team) => (
                <tr key={team.teamId} className="border-b last:border-b-0">
                  <td className="py-2.5 pr-2 font-medium">{team.teamName}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {money(team.accrued, currency)}
                  </td>
                </tr>
              ))}
              {/* Prototype contract: the whole row in amber text, no fill
                  (tr.unatt in prototype/styles.css). */}
              <tr className="border-t font-medium text-amber-700">
                <td className="py-2.5 pr-2">
                  {copy.unattributed}{" "}
                  {breakdown.unattributed > 0 && (
                    <Link
                      href="/ajustes/assinaturas"
                      className="text-xs hover:underline"
                    >
                      {copy.mapIt} →
                    </Link>
                  )}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums">
                  {money(breakdown.unattributed, currency)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mt-3 text-xs text-muted-foreground">
            {copy.reconcile(money(breakdown.orgTotal, currency))}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{copy.seatsNote}</p>
        </section>
      )}
    </div>
  );
}
