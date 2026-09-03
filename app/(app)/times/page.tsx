import Link from "next/link";
import { redirect } from "next/navigation";
import { RiArrowRightSLine, RiPieChartLine, RiTeamLine } from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { Notice } from "@/components/domain/notice";
import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTimesData } from "@/lib/home/queries";
import { money } from "@/lib/money";
import { teamsDiagnosis } from "@/lib/usage/attribution";
import { TeamIndex } from "./_components/team-index";

const copy = {
  title: "Times",
  subtitle: "Compare gasto, orçamento e projeção por time.",
  asOf: (label: string, day: number, days: number) =>
    `${capitalize(label)} · dia ${day} de ${days}`,
  manage: "Gerenciar orçamentos",
  attention: "Precisa de atenção",
  control: "No controle",
  withoutBudget: "Sem orçamento",
  withoutBudgetSub:
    "O gasto continua visível; defina um limite para habilitar projeção e avisos.",
  spent: "Gasto atual",
  defineBudget: "Definir orçamento",
  open: (team: string) => `Abrir diagnóstico de ${team}`,
  emptyTitle: "Nenhum time ainda",
  emptyBody:
    "Importe o roster para ver seus setores aqui, ou conecte os provedores para começar a atribuir o gasto.",
  emptyRosterCta: "Importar roster",
  emptyConnectCta: "Conectar provedores",
  zero: "Sem gasto neste período.",
  noFx: "API em US$ não somada — câmbio do período indisponível.",
  unattributedTitle: "Gasto sem atribuição",
  unattributedBody: (amount: string) =>
    `${amount} ainda não estão associados a um time.`,
  map: "Mapear gasto",
};

const cents = (value: number) => Math.round(value * 100);

function capitalize(value: string): string {
  return value.length === 0
    ? value
    : value[0].toLocaleUpperCase("pt-BR") + value.slice(1);
}

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

  if (teams.length === 0) {
    return (
      <PageContainer variant="wide" className="gap-6">
        <PageHeader title={copy.title} description={copy.subtitle} />
        <EmptyState
          icon={<RiTeamLine />}
          title={copy.emptyTitle}
          description={copy.emptyBody}
          primaryAction={<Link href="/ajustes/roster">{copy.emptyRosterCta}</Link>}
          secondaryAction={
            <Link href="/ajustes/conexoes">{copy.emptyConnectCta}</Link>
          }
        />
      </PageContainer>
    );
  }

  const teamIds = new Set(teams.map((team) => team.id));
  if (focus && teamIds.has(focus)) redirect(`/times/${focus}`);

  const attention = cockpit.state === "ready" ? cockpit.needsAttention : [];
  const control = cockpit.state === "ready" ? cockpit.underControl : [];
  const budgetedIds = new Set(
    [...attention, ...control].map((team) => team.teamId),
  );
  const withoutBudget = teams.filter((team) => !budgetedIds.has(team.id));
  const org =
    cockpit.state === "ready"
      ? { projection: cockpit.org.projection, budget: cockpit.org.budget }
      : null;

  const unattributed = (() => {
    if (data.combinedUnattributed !== null) {
      return cents(data.combinedUnattributed) > 0
        ? money(data.combinedUnattributed, currency)
        : null;
    }
    if (cents(data.seatUnattributed) > 0 || data.apiUnattributedUsd > 0) {
      return data.apiUnattributedUsd > 0
        ? `${money(data.seatUnattributed, currency)} + ${money(data.apiUnattributedUsd, "USD")}`
        : money(data.seatUnattributed, currency);
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
          <Button asChild variant="secondary" size="sm" shape="full">
            <Link href="/ajustes/orcamentos">{copy.manage}</Link>
          </Button>
          ) : undefined
        }
      />

      {org && (
        <div className="flex flex-col gap-5">
          <TeamIndex
            title={copy.attention}
            teams={attention}
            currency={currency}
            org={org}
            priority="attention"
          />
          <TeamIndex
            title={copy.control}
            teams={control}
            currency={currency}
            org={org}
            priority="control"
          />
        </div>
      )}

      {withoutBudget.length > 0 && (
        <section aria-labelledby="without-budget-title">
          <div className="mb-2">
            <h2 id="without-budget-title" className="text-sm font-medium">
              {copy.withoutBudget}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {copy.withoutBudgetSub}
            </p>
          </div>
          <Card className="gap-0 py-0">
            <div className="divide-y divide-border/60">
              {withoutBudget.map((team) => {
                const combined = data.combinedByTeam?.get(team.id);
                const seat = data.seatByTeam.get(team.id) ?? 0;
                const apiUsd = data.apiUsdByTeam.get(team.id) ?? 0;
                const spend =
                  combined !== undefined
                    ? money(combined, currency)
                    : apiUsd > 0
                      ? `${money(seat, currency)} + ${money(apiUsd, "USD")}`
                      : money(seat, currency);
                const note =
                  combined !== undefined && cents(combined) === 0
                    ? copy.zero
                    : combined === undefined && apiUsd > 0
                      ? copy.noFx
                      : undefined;

                return (
                  <Link
                    key={team.id}
                    href={`/times/${team.id}`}
                    aria-label={copy.open(team.name)}
                    className="group flex min-h-14 items-center gap-4 px-4 py-3 outline-none transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard) hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{team.name}</p>
                      {note && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {note}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">{copy.spent}</p>
                      <p className="text-[13px] font-medium tabular-nums">{spend}</p>
                    </div>
                    <span className="hidden text-[11px] text-muted-foreground sm:block">
                      {copy.defineBudget}
                    </span>
                    <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-duration-fast) ease-(--motion-ease-standard) group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {unattributed && (
        <Notice
          icon={<RiPieChartLine />}
          title={copy.unattributedTitle}
          action={
            <Button asChild variant="tertiary" size="xs" motion="forward">
              <Link href="/ajustes/atribuicao">
                {copy.map}
                <RiArrowRightSLine data-icon="inline-end" aria-hidden />
              </Link>
            </Button>
          }
        >
          <span className="tabular-nums">{copy.unattributedBody(unattributed)}</span>
        </Notice>
      )}
    </PageContainer>
  );
}
