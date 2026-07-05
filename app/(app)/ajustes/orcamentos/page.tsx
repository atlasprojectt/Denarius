import Link from "next/link";

import { currentPeriod } from "@/lib/engine/period";
import { money } from "@/lib/money";
import { listBudgets, type Budget } from "@/lib/budgets/queries";
import { listTeams } from "@/lib/teams/queries";

import { BudgetForm, type ExistingBudget } from "./_components/budget-form";

const copy = {
  back: "← Ajustes",
  title: "Orçamentos",
  subtitle:
    "Defina o limite mensal da empresa e de cada time. O orçamento governa o gasto total rastreado (APIs + assinaturas) e destrava o veredito, a projeção de fechamento e os avisos antecipados.",
  periodNote: (label: string) => `Período atual — ${label}.`,
  orgTitle: "Empresa",
  orgSub: "O limite da empresa toda para o período.",
  teamsTitle: "Times",
  teamsSub:
    "Limites independentes por time. A soma dos times não precisa bater com o da empresa — é só um aviso, nunca um erro.",
  noTeams:
    "Nenhum time ainda. Importe o roster para definir orçamentos por time.",
  mismatchOver: (delta: string) =>
    `A soma dos orçamentos dos times está ${delta} acima do orçamento da empresa. Guardrails independentes — apenas um aviso.`,
  mismatchUnder: (delta: string) =>
    `A soma dos orçamentos dos times está ${delta} abaixo do orçamento da empresa. Guardrails independentes — apenas um aviso.`,
  fxDisclosure: (rate: string, source: string, date: string) =>
    `Gasto em dólar convertido a ${rate}/US$ — cotação de ${source}, congelada em ${date}.`,
  fxMissing:
    "Cotação USD→moeda indisponível no momento da criação — o gasto em dólar aparece à parte até haver uma cotação.",
};

/** Warn threshold as a whole percent for the form (the sub-100% crossing). */
function warnPctOf(budget: Budget): number {
  const warn = budget.thresholds.find((t) => t > 0 && t < 1);
  return warn ? Math.round(warn * 100) : 80;
}

function toExisting(budget: Budget | undefined): ExistingBudget | null {
  if (!budget) return null;
  return { id: budget.id, amount: budget.amount, warnPct: warnPctOf(budget) };
}

export default async function BudgetsPage() {
  const period = currentPeriod();
  const [{ org, teams: teamBudgets, currency }, teams] = await Promise.all([
    listBudgets(),
    listTeams(),
  ]);

  const budgetByTeam = new Map(teamBudgets.map((b) => [b.teamId, b]));
  const teamSum = teamBudgets.reduce((sum, b) => sum + b.amount, 0);
  const mismatch = org ? teamSum - org.amount : 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/ajustes"
          className="text-sm text-muted-foreground hover:underline"
        >
          {copy.back}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {copy.title}
        </h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {copy.periodNote(period.monthLabel)}
        </p>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-semibold">{copy.orgTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.orgSub}</p>
        <div className="mt-4">
          <BudgetForm
            scope="org"
            teamId={null}
            currency={currency}
            existing={toExisting(org ?? undefined)}
          />
        </div>
        {org && org.frozenFxRate !== null && org.currency !== "USD" && (
          <p className="mt-3 text-xs text-muted-foreground">
            {copy.fxDisclosure(
              money(org.frozenFxRate, org.currency),
              org.fxRateSource ?? "—",
              org.fxRateDate ?? "—",
            )}
          </p>
        )}
        {org && org.frozenFxRate === null && org.currency !== "USD" && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-500">
            {copy.fxMissing}
          </p>
        )}
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-semibold">{copy.teamsTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.teamsSub}</p>

        {org && mismatch !== 0 && (
          <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {mismatch > 0
              ? copy.mismatchOver(money(mismatch, currency))
              : copy.mismatchUnder(money(-mismatch, currency))}
          </p>
        )}

        {teams.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{copy.noTeams}</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y">
            {teams.map((team) => (
              <li key={team.id} className="flex flex-col gap-2 py-4 first:pt-0">
                <p className="font-medium">{team.name}</p>
                <BudgetForm
                  scope="team"
                  teamId={team.id}
                  currency={currency}
                  existing={toExisting(budgetByTeam.get(team.id))}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
