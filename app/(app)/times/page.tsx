import Link from "next/link";
import { RiInformationLine, RiTeamLine } from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { TeamBudgetTable } from "@/components/domain/team-budget-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { budgetedTeams } from "@/lib/engine/cockpit";
import { getTimesData } from "@/lib/home/queries";
import { money } from "@/lib/money";
import { UnbudgetedTeams, type UnbudgetedTeam } from "./_components/unbudgeted-teams";

// The Times tab (2026-07): the CEO's per-sector view — how each team is doing
// against its budget, all in one place. Budgeted teams carry the semaphore and
// pacing (shared TeamBudgetTable, at-risk first); teams without a budget sit
// below with their combined spend and a nudge to set one, and the unattributed
// bucket closes the list so spend never silently disappears (invariant #3).
// Read-only overview; acting on a team lives in its /times/[id] detail. No
// arithmetic here — getTimesData combines via the engine (architecture §9).

const copy = {
  title: "Times",
  subtitle:
    "Como vai cada setor — orçamento, ritmo e projeção, time a time. Clique em um time para investigar.",
  asOf: (label: string, day: number, days: number) =>
    `${label}, dia ${day} de ${days}`,
  emptyTitle: "Nenhum time ainda",
  emptyBody:
    "Importe o roster para ver seus setores aqui, ou conecte os provedores para começar a atribuir o gasto.",
  emptyRosterCta: "Importar roster",
  emptyConnectCta: "Conectar provedores",
  noBudgetsLead:
    "Defina orçamentos por time para acompanhar o veredito de cada setor e receber avisos antecipados.",
  setBudgetCta: "Definir orçamentos",
  zero: "Sem gasto neste período.",
  noFx: "API em US$ não somada — câmbio do período indisponível.",
  unattributed: "Não atribuído",
  mapIt: "Gasto sem time — mapeie em Ajustes → Atribuição.",
};

/** Cent-rounded comparisons — a sub-cent float must not suppress the zero note
 *  while money() displays it as 0,00. */
const cents = (value: number) => Math.round(value * 100);

export default async function TimesPage() {
  const data = await getTimesData();
  const { cockpit, period, currency, teams } = data;

  // No teams at all → cold-start CTA, never a blank screen (F5 required state).
  if (teams.length === 0) {
    return (
      <PageContainer variant="wide" className="gap-6">
        <PageHeader title={copy.title} description={copy.subtitle} />
        <EmptyState
          icon={<RiTeamLine />}
          title={copy.emptyTitle}
          description={copy.emptyBody}
          primaryAction={
            <Link href="/ajustes/roster">{copy.emptyRosterCta}</Link>
          }
          secondaryAction={
            <Link href="/ajustes/conexoes">{copy.emptyConnectCta}</Link>
          }
        />
      </PageContainer>
    );
  }

  const budgeted = budgetedTeams(cockpit);
  const budgetedIds = new Set(budgeted.map((t) => t.teamId));

  const unbudgeted: UnbudgetedTeam[] = teams
    .filter((t) => !budgetedIds.has(t.id))
    .map((t) => {
      if (data.combinedByTeam !== null) {
        const combined = data.combinedByTeam.get(t.id) ?? 0;
        return {
          id: t.id,
          name: t.name,
          spend: money(combined, currency),
          note: cents(combined) === 0 ? copy.zero : undefined,
        };
      }
      // FX missing: seats are native display currency and honest to show; API
      // is USD and can't be summed in — disclose the omission, never guess.
      const seat = data.seatByTeam.get(t.id) ?? 0;
      const apiUsd = data.apiUsdByTeam.get(t.id) ?? 0;
      return {
        id: t.id,
        name: t.name,
        spend: money(seat, currency),
        note: apiUsd > 0 ? copy.noFx : cents(seat) === 0 ? copy.zero : undefined,
      };
    });

  // The unattributed bucket is first-class (invariant #3): shared seats and
  // unmapped API spend close the list with a nudge to Atribuição.
  if (data.combinedUnattributed !== null) {
    if (cents(data.combinedUnattributed) > 0) {
      unbudgeted.push({
        id: "__unattributed__",
        name: copy.unattributed,
        spend: money(data.combinedUnattributed, currency),
        note: copy.mapIt,
        href: "/ajustes/atribuicao",
      });
    }
  } else if (cents(data.seatUnattributed) > 0 || data.apiUnattributedUsd > 0) {
    unbudgeted.push({
      id: "__unattributed__",
      name: copy.unattributed,
      spend: money(data.seatUnattributed, currency),
      note: data.apiUnattributedUsd > 0 ? copy.noFx : copy.mapIt,
      href: "/ajustes/atribuicao",
    });
  }

  return (
    <PageContainer variant="wide" className="gap-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        meta={copy.asOf(period.monthLabel, period.dayOfPeriod, period.daysInPeriod)}
      />

      {budgeted.length > 0 ? (
        <TeamBudgetTable
          teams={budgeted}
          attentionCount={
            cockpit.state === "ready" ? cockpit.needsAttention.length : 0
          }
          currency={currency}
        />
      ) : (
        <Alert>
          <RiInformationLine />
          <AlertDescription className="flex flex-col items-start gap-3">
            <p>{copy.noBudgetsLead}</p>
            <Button size="sm" asChild>
              <Link href="/ajustes/orcamentos">{copy.setBudgetCta}</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <UnbudgetedTeams teams={unbudgeted} />
    </PageContainer>
  );
}
