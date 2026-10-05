import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChevronRightIcon } from "@hugeicons/core-free-icons";

import { StatusPill } from "@/components/domain/status-pill";
import { Card } from "@/components/ui/card";
import type { CockpitTeam } from "@/lib/engine/cockpit";
import { percent } from "@/lib/format";
import { money, signedMoney } from "@/lib/money";
import { TeamProgress } from "./team-progress";

const copy = {
  team: "Time",
  status: "Situação",
  spent: "Gasto",
  budget: "Orçamento",
  projection: "Projeção",
  progress: "Progresso",
  collecting: "Coletando ritmo",
  spentVsBudget: (delta: string) => `Gasto X orçamento: ${delta}`,
  projectionVsBudget: (delta: string) => `Projeção X orçamento: ${delta}`,
  thresholdContext: (value: string) => `Já consumiu ${value} do orçamento`,
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
    return copy.spentVsBudget(
      signedMoney(evaluation.spent - evaluation.budget, currency),
    );
  }
  if (evaluation.projectedMargin === null) return copy.collecting;
  if (evaluation.projectedMargin >= 0 && team.finding !== null) {
    return copy.thresholdContext(percent(evaluation.pctSpent));
  }
  // projection − budget is the margin's negation: "+" closes above, "−" below.
  return copy.projectionVsBudget(
    signedMoney(-evaluation.projectedMargin, currency),
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="team-index-metric-label text-xs text-muted-foreground">{label}</dt>
      <dd className="team-index-metric-value mt-0.5 truncate text-ui font-medium tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function TeamRow({
  team,
  currency,
  index,
}: {
  team: CockpitTeam;
  currency: string;
  index: number;
}) {
  const evaluation = team.evaluation;
  const href = `/times/${team.teamId}`;

  return (
    <article
      data-reveal-legend
      style={{ animationDelay: `${70 + index * 55}ms` }}
      className="group/row relative px-4 py-3.5 transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard) hover:bg-surface-hover"
    >
      <Link
        href={href}
        aria-label={copy.open(team.teamName)}
        className="absolute inset-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
      />

      <div className="team-index-row-grid relative pointer-events-none grid gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-ui font-medium text-foreground">
            {team.teamName}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {contextLine(team, currency)}
          </p>
        </div>

        <div className="w-fit">
          <StatusPill status={team.status} label={statusLabel(team)} />
        </div>

        <dl className="team-index-metrics grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
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
        </dl>

        <div className="team-index-progress flex items-center gap-2.5">
          <TeamProgress
            className="flex-1"
            pctSpent={evaluation.pctSpent}
            pctProjected={team.pctProjected}
            status={team.status}
          />
          <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {percent(evaluation.pctSpent)}
          </span>
        </div>

        <div className="flex items-center justify-end">
          <HugeiconsIcon icon={ChevronRightIcon}
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
  priority,
}: {
  title: string;
  teams: CockpitTeam[];
  currency: string;
  priority: "attention" | "control";
}) {
  if (teams.length === 0) return null;

  return (
    <section aria-labelledby={`team-group-${priority}`}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 id={`team-group-${priority}`} className="text-sm font-medium">
          {title}
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {teams.length}
        </span>
      </div>
      <Card
        data-reveal={`teams-${priority}`}
        data-team-index
        suppressHydrationWarning
        className="team-index-card gap-0 py-0"
      >
        <div className="team-index-header hidden gap-4 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>{copy.team}</span>
          <span>{copy.status}</span>
          <span>{copy.spent}</span>
          <span>{copy.budget}</span>
          <span>{copy.projection}</span>
          <span>{copy.progress}</span>
          <span aria-hidden />
        </div>
        <div className="divide-y divide-border">
          {teams.map((team, index) => (
            <TeamRow
              key={team.teamId}
              team={team}
              currency={currency}
              index={index}
            />
          ))}
        </div>
      </Card>
    </section>
  );
}
