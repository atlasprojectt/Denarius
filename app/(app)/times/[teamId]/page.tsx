import { notFound } from "next/navigation";

import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { SimulateDrawer } from "@/components/domain/simulate-drawer";
import { StateBadge } from "@/components/domain/state-badge";
import { StatusPill } from "@/components/domain/status-pill";
import { findCockpitTeam, type CockpitTeam } from "@/lib/engine/cockpit";
import { getTimesData } from "@/lib/home/queries";
import { teamsDiagnosis } from "@/lib/usage/attribution";
import { BudgetEditDialog } from "../_components/budget-edit-dialog";
import { DiagnosisBody } from "../_components/diagnosis-sections";

const copy = {
  back: "Times",
  description: "Diagnóstico de gasto, projeção e principais contribuintes.",
  period: (label: string, day: number, days: number) =>
    `${capitalize(label)} · dia ${day} de ${days}`,
  simulate: "Simular cenário",
  noBudget: "Sem orçamento",
};

function capitalize(value: string): string {
  return value.length === 0
    ? value
    : value[0].toLocaleUpperCase("pt-BR") + value.slice(1);
}

function statusLabel(status: CockpitTeam["status"]): string {
  if (status === "amber") return "Em risco";
  if (status === "red") return "Estourado";
  return status === "collecting" ? "Coletando ritmo" : "No controle";
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const [{ teamId }, data, diagnosis] = await Promise.all([
    params,
    getTimesData(),
    teamsDiagnosis(),
  ]);
  const team = data.teams.find((candidate) => candidate.id === teamId);
  if (!team) notFound();

  const cockpitTeam = findCockpitTeam(data.cockpit, teamId) ?? null;
  const org =
    data.cockpit.state === "ready"
      ? {
          projection: data.cockpit.org.projection,
          budget: data.cockpit.org.budget,
        }
      : null;

  return (
    <PageContainer variant="wide" className="gap-6">
      <PageHeader
        backHref="/times"
        backLabel={copy.back}
        title={team.name}
        description={copy.description}
        meta={copy.period(
          data.period.monthLabel,
          data.period.dayOfPeriod,
          data.period.daysInPeriod,
        )}
        actions={
          <>
            {cockpitTeam !== null ? (
              <StatusPill
                status={cockpitTeam.status}
                label={statusLabel(cockpitTeam.status)}
              />
            ) : (
              <StateBadge>{copy.noBudget}</StateBadge>
            )}
            {cockpitTeam !== null && org !== null && (
              <SimulateDrawer
                triggerLabel={copy.simulate}
                teamName={team.name}
                currency={data.currency}
                team={{
                  spent: cockpitTeam.evaluation.spent,
                  projection: cockpitTeam.evaluation.projection,
                  budget: cockpitTeam.evaluation.budget,
                }}
                org={org}
              />
            )}
            {diagnosis.isAdmin && (
              <BudgetEditDialog
                teamId={teamId}
                teamName={team.name}
                currency={data.currency}
                existing={
                  cockpitTeam === null
                    ? null
                    : {
                        amount: cockpitTeam.evaluation.budget,
                        warnPct: cockpitTeam.warnPct,
                      }
                }
              />
            )}
          </>
        }
      />

      <DiagnosisBody
        teamId={teamId}
        currency={data.currency}
        period={data.period}
        fx={data.fx}
        seatAccrued={data.seatByTeam.get(teamId) ?? 0}
        apiUsd={data.apiUsdByTeam.get(teamId) ?? 0}
        diagnosis={diagnosis.byTeam.get(teamId) ?? null}
        cockpitTeam={cockpitTeam}
        isAdmin={diagnosis.isAdmin}
        namesHidden={diagnosis.namesHidden}
      />
    </PageContainer>
  );
}
