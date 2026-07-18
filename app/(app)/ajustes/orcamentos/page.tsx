import { RiInformationLine } from "@remixicon/react";

import { PageHeader } from "@/components/domain/page-header";
import { PageContainer } from "@/components/domain/page-container";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { currentPeriod } from "@/lib/engine/period";
import { money } from "@/lib/money";
import { listBudgets, type Budget } from "@/lib/budgets/queries";
import { listTeams } from "@/lib/teams/queries";

import { BudgetTableForm, type BudgetTableRow } from "./_components/budget-table-form";

const copy = {
  back: "Ajustes",
  title: "Orçamentos",
  subtitle:
    "O limite mensal da empresa e de cada time. O orçamento governa o gasto total rastreado (APIs + assinaturas) e destrava o veredito, a projeção de fechamento e os avisos antecipados.",
  periodNote: (label: string) => `Período atual — ${label}`,
  tableTitle: "Empresa e times",
  tableSub: "Edite todos os limites e salve uma vez. Empresa e times são guardrails independentes.",
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

function toExisting(budget: Budget | undefined): BudgetTableRow["existing"] {
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
  const rows: BudgetTableRow[] = [
    { key: "org", label: "Empresa", existing: toExisting(org ?? undefined) },
    ...teams.map((team) => ({
      key: `team:${team.id}`,
      label: team.name,
      existing: toExisting(budgetByTeam.get(team.id)),
    })),
  ];

  return (
    <PageContainer variant="settings" className="gap-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        backHref="/ajustes"
        backLabel={copy.back}
        meta={copy.periodNote(period.monthLabel)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{copy.tableTitle}</CardTitle>
          <CardDescription>{copy.tableSub}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {org && mismatch !== 0 && (
            <Alert>
              <RiInformationLine />
              <AlertDescription>
                {mismatch > 0
                  ? copy.mismatchOver(money(mismatch, currency))
                  : copy.mismatchUnder(money(-mismatch, currency))}
              </AlertDescription>
            </Alert>
          )}

          {teams.length === 0 && (
            <p className="text-sm text-muted-foreground">{copy.noTeams}</p>
          )}
          <BudgetTableForm rows={rows} currency={currency} />
        </CardContent>
        {org && org.currency !== "USD" && (
          <CardFooter className={`text-xs/relaxed ${org.frozenFxRate === null ? "text-status-amber-fg" : "text-muted-foreground"}`}>
            <p>
              {org.frozenFxRate !== null
                ? copy.fxDisclosure(money(org.frozenFxRate, org.currency), org.fxRateSource ?? "—", org.fxRateDate ?? "—")
                : copy.fxMissing}
            </p>
          </CardFooter>
        )}
      </Card>
    </PageContainer>
  );
}
