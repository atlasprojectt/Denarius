import Link from "next/link";
import { RiArrowRightSLine } from "@remixicon/react";

import { SimulateDrawer } from "@/components/domain/simulate-drawer";
import { StatusPill } from "@/components/domain/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CockpitTeam } from "@/lib/engine/cockpit";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";
import { TeamProgress } from "./team-progress";

const copy = {
  team: "Time",
  status: "Situação",
  spent: "Gasto",
  budget: "Orçamento",
  projection: "Projeção",
  margin: "Margem projetada",
  progress: "Progresso",
  actions: "Ações",
  investigate: "Investigar",
  collecting: "Coletando ritmo",
  breachContext: (amount: string) => `Já está ${amount} acima do orçamento.`,
  riskContext: (amount: string) => `Projetado para fechar ${amount} acima.`,
  controlContext: (amount: string) => `Projetado para fechar ${amount} abaixo.`,
  thresholdContext: (value: string) => `Já consumiu ${value} do orçamento.`,
  above: (amount: string) => `${amount} acima`,
  headroom: (amount: string) => `${amount} de folga`,
  open: (team: string) => `Abrir diagnóstico de ${team}`,
};

function statusLabel(team: CockpitTeam): string {
  if (team.status === "amber") return "Em risco";
  if (team.status === "red") return "Estourado";
  return team.status === "collecting" ? "Coletando ritmo" : "No controle";
}

function contextLine(team: CockpitTeam, currency: string): string {
  const evaluation = team.evaluation;
  if (evaluation.breached) {
    return copy.breachContext(money(evaluation.spent - evaluation.budget, currency));
  }
  if (evaluation.projectedMargin === null) return copy.collecting;
  if (evaluation.projectedMargin < 0) {
    return copy.riskContext(money(-evaluation.projectedMargin, currency));
  }
  if (team.finding !== null) return copy.thresholdContext(percent(evaluation.pctSpent));
  return copy.controlContext(money(evaluation.projectedMargin, currency));
}

function marginLabel(team: CockpitTeam, currency: string): string {
  const margin = team.evaluation.projectedMargin;
  if (margin === null) return "—";
  return margin < 0
    ? copy.above(money(-margin, currency))
    : copy.headroom(money(margin, currency));
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground xl:sr-only">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium tabular-nums xl:mt-0">
        {value}
      </dd>
    </div>
  );
}

function TeamRow({
  team,
  currency,
  org,
  priority,
  index,
}: {
  team: CockpitTeam;
  currency: string;
  org: { projection: number | null; budget: number };
  priority: "attention" | "control";
  index: number;
}) {
  const evaluation = team.evaluation;
  const href = `/times/${team.teamId}`;

  return (
    <article
      data-reveal-legend
      style={{ animationDelay: `${70 + index * 55}ms` }}
      className={cn(
        "group/row relative px-4 py-3.5 transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard) hover:bg-muted/20",
        priority === "attention" && "bg-muted/10",
      )}
    >
      <Link
        href={href}
        aria-label={copy.open(team.teamName)}
        className="absolute inset-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
      />

      <div className="relative pointer-events-none grid gap-3 xl:grid-cols-[minmax(170px,1.35fr)_104px_108px_108px_118px_138px_minmax(110px,0.8fr)_172px] xl:items-center xl:gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-medium text-foreground">
            {team.teamName}
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {contextLine(team, currency)}
          </p>
        </div>

        <div className="w-fit">
          <StatusPill status={team.status} label={statusLabel(team)} />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 xl:contents">
          <Metric label={copy.spent} value={money(evaluation.spent, currency)} />
          <Metric label={copy.budget} value={money(evaluation.budget, currency)} />
          <Metric
            label={copy.projection}
            value={
              evaluation.projection === null
                ? "—"
                : money(evaluation.projection, currency)
            }
          />
          <Metric label={copy.margin} value={marginLabel(team, currency)} />
        </dl>

        <div className="flex items-center gap-2.5 xl:pr-3">
          <TeamProgress
            className="flex-1"
            pctSpent={evaluation.pctSpent}
            pctProjected={team.pctProjected}
            status={team.status}
          />
          <span className="w-10 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
            {percent(evaluation.pctSpent)}
          </span>
        </div>

        <div className="pointer-events-auto relative z-10 flex items-center justify-end gap-1.5">
          {priority === "attention" && (
            <>
              <Button asChild variant="secondary" size="xs" shape="compact">
                <Link href={href}>{copy.investigate}</Link>
              </Button>
              <SimulateDrawer
                teamName={team.teamName}
                currency={currency}
                team={{
                  spent: evaluation.spent,
                  projection: evaluation.projection,
                  budget: evaluation.budget,
                }}
                org={org}
              />
            </>
          )}
          <RiArrowRightSLine
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-duration-fast) ease-(--motion-ease-standard) group-hover/row:translate-x-0.5"
          />
        </div>
      </div>
    </article>
  );
}

export function TeamIndex({
  title,
  teams,
  currency,
  org,
  priority,
}: {
  title: string;
  teams: CockpitTeam[];
  currency: string;
  org: { projection: number | null; budget: number };
  priority: "attention" | "control";
}) {
  if (teams.length === 0) return null;

  return (
    <section aria-labelledby={`team-group-${priority}`}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 id={`team-group-${priority}`} className="text-sm font-medium">
          {title}
        </h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {teams.length}
        </span>
      </div>
      <Card
        data-reveal={`teams-${priority}`}
        suppressHydrationWarning
        className="gap-0 py-0"
      >
        <div className="hidden grid-cols-[minmax(170px,1.35fr)_104px_108px_108px_118px_138px_minmax(110px,0.8fr)_172px] gap-4 border-b border-border/60 px-4 py-2 text-[11px] font-medium text-muted-foreground xl:grid">
          <span>{copy.team}</span>
          <span>{copy.status}</span>
          <span>{copy.spent}</span>
          <span>{copy.budget}</span>
          <span>{copy.projection}</span>
          <span>{copy.margin}</span>
          <span>{copy.progress}</span>
          <span className="text-right">{copy.actions}</span>
        </div>
        <div className="divide-y divide-border/60">
          {teams.map((team, index) => (
            <TeamRow
              key={team.teamId}
              team={team}
              currency={currency}
              org={org}
              priority={priority}
              index={index}
            />
          ))}
        </div>
      </Card>
    </section>
  );
}
