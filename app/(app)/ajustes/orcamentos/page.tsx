import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { UsersIcon } from "@hugeicons/core-free-icons";

import { EmptyState } from "@/components/domain/empty-state";
import { Notice } from "@/components/domain/notice";
import { PageHeader } from "@/components/domain/page-header";
import { PageContainer } from "@/components/domain/page-container";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { currentRole } from "@/lib/auth/session";
import { currentPeriod } from "@/lib/engine/period";
import { money, signedMoney } from "@/lib/money";
import { listBudgets } from "@/lib/budgets/queries";
import { budgetTableRows } from "@/lib/budgets/rows";
import { canEditCompanySettings } from "@/lib/settings/account";
import { listTeams } from "@/lib/teams/queries";

import { BudgetTableForm } from "@/components/domain/budget-table-form";

const copy = {
  back: "Ajustes",
  title: "Orçamentos",
  orgRow: "Empresa",
  subtitle:
    "O limite mensal da empresa e de cada time. O orçamento governa o gasto total rastreado (APIs + assinaturas) e destrava o veredito, a projeção de fechamento e os avisos antecipados.",
  periodNote: (label: string) => `Período atual — ${label}`,
  tableTitle: "Empresa e times",
  tableSub: "Edite todos os limites e salve uma vez. Empresa e times são guardrails independentes.",
  noTeamsTitle: "Nenhum time ainda",
  noTeamsBody:
    "Importe o roster para definir orçamentos por time. O orçamento da empresa acima já funciona sozinho.",
  noTeamsCta: "Importar roster",
  mismatch: (delta: string) =>
    `Soma dos times X orçamento da empresa: ${delta}. Guardrails independentes — apenas um aviso.`,
  fxDisclosure: (rate: string, source: string, date: string) =>
    `Gasto em dólar convertido a ${rate}/US$ — cotação de ${source}, congelada em ${date}.`,
  fxMissing:
    "Cotação USD→moeda indisponível no momento da criação — o gasto em dólar aparece à parte até haver uma cotação.",
};

export default async function BudgetsPage() {
  const period = currentPeriod();
  const [{ org, teams: teamBudgets, currency }, teams, role] = await Promise.all([
    listBudgets(),
    listTeams(),
    currentRole(),
  ]);
  const isAdmin = canEditCompanySettings(role ?? "viewer");

  const teamSum = teamBudgets.reduce((sum, b) => sum + b.amount, 0);
  const mismatch = org ? teamSum - org.amount : 0;
  const rows = budgetTableRows(org, teamBudgets, teams, copy.orgRow);

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
            <Notice>
              {copy.mismatch(signedMoney(mismatch, currency))}
            </Notice>
          )}
          {org && org.currency !== "USD" && org.frozenFxRate === null && (
            <Notice tone="amber">
              {copy.fxMissing}
            </Notice>
          )}

          <BudgetTableForm rows={rows} currency={currency} isAdmin={isAdmin} />
          {teams.length === 0 && (
            <EmptyState
              icon={<HugeiconsIcon icon={UsersIcon} />}
              title={copy.noTeamsTitle}
              description={copy.noTeamsBody}
              primaryAction={<Link href="/ajustes/roster">{copy.noTeamsCta}</Link>}
              className="border-none py-4"
            />
          )}
        </CardContent>
        {org && org.currency !== "USD" && org.frozenFxRate !== null && (
          <CardFooter className="text-xs/relaxed text-muted-foreground">
            <p>
              {copy.fxDisclosure(money(org.frozenFxRate, org.currency), org.fxRateSource ?? "—", org.fxRateDate ?? "—")}
            </p>
          </CardFooter>
        )}
      </Card>
    </PageContainer>
  );
}
