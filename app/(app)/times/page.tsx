import Link from "next/link";
import { RiArrowRightSLine, RiTeamLine } from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { Card } from "@/components/ui/card";
import { budgetedTeams } from "@/lib/engine/cockpit";
import { getTimesData } from "@/lib/home/queries";
import { money } from "@/lib/money";
import { teamsDiagnosis } from "@/lib/usage/attribution";
import {
  BudgetedSummary,
  BudgetedSummaryDetails,
  DiagnosisBody,
  UnbudgetedSummary,
  UnbudgetedSummaryDetails,
} from "./_components/diagnosis-sections";
import { TeamDiagnosisCard } from "./_components/team-diagnosis-card";

// The Times tab, Fase 1 da reestruturação triagem/gestão (2026-07): Home
// triages, THIS page diagnoses. Every team — budgeted or not — is a
// collapsible diagnosis card answering "o que aconteceu e o que eu ajusto?":
// daily pace vs expected, spend decomposition, contributors (Admin-only),
// state/projection, [Simular] and inline budget editing. `?focus=<team_id>`
// (the Home warning's landing) opens that team's card and scrolls to it; the
// cold sidebar entry shows all teams collapsed — completeness is the job, no
// healthy-team collapse here. The unattributed bucket closes the list so
// spend never silently disappears (invariant #3). No arithmetic here — the
// engine and the diagnosis grouping already did it (architecture §9).

const copy = {
  title: "Times",
  subtitle:
    "O que aconteceu em cada setor — ritmo, decomposição, contribuintes e simulação. Expanda um time para diagnosticar.",
  asOf: (label: string, day: number, days: number) =>
    `${label}, dia ${day} de ${days}`,
  manageAll: "Gerenciar todos os orçamentos",
  emptyTitle: "Nenhum time ainda",
  emptyBody:
    "Importe o roster para ver seus setores aqui, ou conecte os provedores para começar a atribuir o gasto.",
  emptyRosterCta: "Importar roster",
  emptyConnectCta: "Conectar provedores",
  budgetedHeading: "Com orçamento",
  unbudgetedHeading: "Sem orçamento",
  unbudgetedLead:
    "Setores ainda sem orçamento definido. O diagnóstico funciona; defina um orçamento para destravar veredito, projeção e avisos.",
  zero: "Sem gasto neste período.",
  noFx: "API em US$ não somada — câmbio do período indisponível.",
  unattributed: "Não atribuído",
  mapIt: "Gasto sem time — mapeie em Ajustes → Atribuição.",
};

/** Cent-rounded comparisons — a sub-cent float must not suppress the zero note
 *  while money() displays it as 0,00. */
const cents = (value: number) => Math.round(value * 100);

export default async function TimesPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const [{ focus }, data, diagnosis] = await Promise.all([
    searchParams,
    getTimesData(),
    teamsDiagnosis(),
  ]);
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
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  // Only a real team id focuses — a stale or foreign id degrades to the cold
  // entry instead of scrolling nowhere.
  const focusId = focus !== undefined && teamName.has(focus) ? focus : null;

  const org =
    cockpit.state === "ready"
      ? { projection: cockpit.org.projection, budget: cockpit.org.budget }
      : null;

  const unbudgeted = teams.filter((t) => !budgetedIds.has(t.id));

  /** Combined-spend summary line for a team without a budget (FX-missing
   *  disclosed, never guessed — invariant #4). */
  const unbudgetedSpend = (teamId: string): { spend: string; note?: string } => {
    if (data.combinedByTeam !== null) {
      const combined = data.combinedByTeam.get(teamId) ?? 0;
      return {
        spend: money(combined, currency),
        note: cents(combined) === 0 ? copy.zero : undefined,
      };
    }
    const seat = data.seatByTeam.get(teamId) ?? 0;
    const apiUsd = data.apiUsdByTeam.get(teamId) ?? 0;
    return {
      spend: money(seat, currency),
      note: apiUsd > 0 ? copy.noFx : cents(seat) === 0 ? copy.zero : undefined,
    };
  };

  const diagnosisBody = (teamId: string, name: string) => (
    <DiagnosisBody
      teamId={teamId}
      teamName={name}
      currency={currency}
      period={period}
      fx={data.fx}
      seatAccrued={data.seatByTeam.get(teamId) ?? 0}
      apiUsd={data.apiUsdByTeam.get(teamId) ?? 0}
      diagnosis={diagnosis.byTeam.get(teamId) ?? null}
      cockpitTeam={budgeted.find((t) => t.teamId === teamId) ?? null}
      org={org}
      isAdmin={diagnosis.isAdmin}
      namesHidden={diagnosis.namesHidden}
    />
  );

  // The unattributed bucket is first-class (invariant #3): shared seats and
  // unmapped API spend close the list with a nudge to Atribuição.
  const unattributed = (() => {
    if (data.combinedUnattributed !== null) {
      return cents(data.combinedUnattributed) > 0
        ? { spend: money(data.combinedUnattributed, currency), note: copy.mapIt }
        : null;
    }
    if (cents(data.seatUnattributed) > 0 || data.apiUnattributedUsd > 0) {
      return {
        spend: money(data.seatUnattributed, currency),
        note: data.apiUnattributedUsd > 0 ? copy.noFx : copy.mapIt,
      };
    }
    return null;
  })();

  return (
    <PageContainer variant="wide" className="gap-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        meta={copy.asOf(period.monthLabel, period.dayOfPeriod, period.daysInPeriod)}
        actions={
          diagnosis.isAdmin ? (
            <Link
              href="/ajustes/orcamentos"
              className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {copy.manageAll}
            </Link>
          ) : undefined
        }
      />

      {budgeted.length > 0 && (
        <section aria-label={copy.budgetedHeading} className="flex flex-col gap-3">
          {budgeted.map((team) => (
            <TeamDiagnosisCard
              key={team.teamId}
              teamName={team.teamName}
              focused={focusId === team.teamId}
              header={<BudgetedSummary team={team} />}
              headerDetails={
                <BudgetedSummaryDetails team={team} currency={currency} />
              }
            >
              {diagnosisBody(team.teamId, team.teamName)}
            </TeamDiagnosisCard>
          ))}
        </section>
      )}

      {unbudgeted.length > 0 && (
        <section aria-label={copy.unbudgetedHeading} className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium">{copy.unbudgetedHeading}</h2>
            <p className="mt-0.5 text-xs/relaxed text-muted-foreground">
              {copy.unbudgetedLead}
            </p>
          </div>
          {unbudgeted.map((team) => {
            const summary = unbudgetedSpend(team.id);
            return (
              <TeamDiagnosisCard
                key={team.id}
                teamName={team.name}
                focused={focusId === team.id}
                header={<UnbudgetedSummary name={team.name} />}
                headerDetails={
                  <UnbudgetedSummaryDetails
                    spend={summary.spend}
                    note={summary.note}
                  />
                }
              >
                {diagnosisBody(team.id, team.name)}
              </TeamDiagnosisCard>
            );
          })}
        </section>
      )}

      {unattributed !== null && (
        <Card className="py-0">
          <Link
            href="/ajustes/atribuicao"
            className="group flex items-center gap-3 px-(--card-spacing) py-(--card-spacing) outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium transition-colors group-hover:text-foreground">
                {copy.unattributed}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {unattributed.note}
              </p>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {unattributed.spend}
            </span>
            <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </Card>
      )}
    </PageContainer>
  );
}
