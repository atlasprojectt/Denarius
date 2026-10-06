"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SlidersHorizontalIcon } from "@hugeicons/core-free-icons";

import { ScenarioChart } from "@/components/domain/scenario-chart";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import {
  buildScenarioComparison,
  type CumulativePoint,
} from "@/lib/engine/cumulative";
import {
  breakEvenDelta,
  simulatePace,
  type ScenarioInput,
  type ScopeOutcome,
} from "@/lib/engine/scenario";
import { money, signedMoney } from "@/lib/money";
import { signedPercent } from "@/lib/format";

// The contextual scenario simulator (#21, PRD story 36): a right-side drawer
// opened from a team with that team pre-loaded (domain component, frontend
// F5). One lever — the team's remaining pace — recomputed instantly on the
// client by the pure engine (lib/engine/scenario.ts). No LLM, no round-trip;
// estimates, disclosed. Team and company outcomes are stated SEPARATELY, each
// against its own budget (2026-07-11 audit, QA-04), and the "fechar no
// orçamento" preset targets the TEAM's budget with the exact delta — no
// rounding drift between the preset and the numbers shown (QA-10). The chart
// (2026-10-05) draws the same outcome: realized spend, then the current-pace
// and simulated paths to the close, against the team budget.

const copy = {
  title: "Simular",
  subtitle: (team: string) => `Cenário para ${team}`,
  currentPace: "Ritmo atual",
  spent: "Gasto até agora",
  projected: "Projeção de fechamento",
  budget: "Orçamento do time",
  lever: "Variação do ritmo do time até o fim do mês",
  deltaZero: "ritmo atual",
  presetCurrent: "Ritmo atual",
  presetBreakEven: "Fechar no orçamento",
  presetCut: "−30%",
  breakEvenUnreachable:
    "O gasto já realizado passa do orçamento do time — nem parando agora este time fecha dentro. O ajuste passa pelo orçamento ou por outros times.",
  resultTitle: "Neste cenário",
  teamCloses: "Time fecha em",
  orgCloses: "Empresa fecha em",
  teamVsBudget: (delta: string) => `${delta} X orçamento do time`,
  orgVsBudget: (delta: string) => `${delta} X orçamento da empresa`,
  collecting:
    "Coletando ritmo — a simulação usa a projeção de fechamento, disponível a partir do dia 5 do período.",
  disclaimer:
    "Estimativa linear sobre o ritmo atual — não é uma previsão. O Denarius aponta; a decisão é sua.",
};

const FIXED_CUT = -30; // the "−30%" preset, whole percent
const LEVER_MIN = -100;
const LEVER_MAX = 100;

export type SimulateDrawerProps = {
  teamName: string;
  currency: string;
  team: { spent: number; projection: number | null; budget: number };
  org: { projection: number | null; budget: number };
  /** The team's realized cumulative spend, day 1 through today — the same
   *  series as the diagnosis chart, so the drawer's chart starts where it ends. */
  points: CumulativePoint[];
  daysInPeriod: number;
  triggerLabel?: string;
};

function deltaLabel(deltaPct: number): string {
  return deltaPct === 0 ? copy.deltaZero : signedPercent(deltaPct / 100);
}

export function SimulateDrawer(props: SimulateDrawerProps) {
  const {
    teamName,
    currency,
    team,
    org,
    points,
    daysInPeriod,
    triggerLabel = copy.title,
  } = props;
  const [deltaPct, setDeltaPct] = useState(0);

  // Before day 5 the projection guard holds — nothing honest to simulate.
  const collecting = team.projection === null || org.projection === null;

  return (
    // Every open starts a fresh scenario — a stale slider from a previous
    // session could read as the current state.
    <Sheet onOpenChange={(open) => open && setDeltaPct(0)}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 sm:h-7">
          <HugeiconsIcon icon={SlidersHorizontalIcon} className="size-4" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className="max-h-dvh w-full overflow-hidden sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{copy.title}</SheetTitle>
          <SheetDescription>{copy.subtitle(teamName)}</SheetDescription>
        </SheetHeader>

        {collecting ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Facts
              rows={[
                [copy.spent, money(team.spent, currency)],
                [copy.budget, money(team.budget, currency)],
              ]}
            />
            <p className="rounded-md bg-muted p-3 text-xs/relaxed text-muted-foreground">
              {copy.collecting}
            </p>
          </div>
        ) : (
          <Simulation
            input={{
              org: { budget: org.budget, projection: org.projection as number },
              team: {
                budget: team.budget,
                spent: team.spent,
                projection: team.projection as number,
              },
            }}
            points={points}
            daysInPeriod={daysInPeriod}
            currency={currency}
            deltaPct={deltaPct}
            onDeltaChange={setDeltaPct}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Simulation({
  input,
  points,
  daysInPeriod,
  currency,
  deltaPct,
  onDeltaChange,
}: {
  input: ScenarioInput;
  points: CumulativePoint[];
  daysInPeriod: number;
  currency: string;
  deltaPct: number;
  onDeltaChange: (value: number) => void;
}) {
  const result = simulatePace(input, deltaPct / 100);
  const breakEven = breakEvenDelta(input);
  // Exact delta, never the rounded label value — the preset's team close must
  // land ON the budget, not near it (QA-10 acceptance).
  const breakEvenPct =
    breakEven.reachable && breakEven.delta !== null
      ? breakEven.delta * 100
      : null;
  const chartRows = buildScenarioComparison({
    points,
    projection: input.team.projection,
    simulatedClose: result.team.close,
    daysInPeriod,
  });
  const hasSpend = points.some((point) => point.spent > 0);
  // The axis spans the lever's whole range (the +100% close is the ceiling),
  // so the scenario line moves on a fixed scale instead of the scale moving.
  const ceiling = simulatePace(input, LEVER_MAX / 100).team.close;
  const yMax =
    Math.max(input.team.budget, input.team.projection, ceiling, 1) * 1.08;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Facts
        rows={[
          [copy.spent, money(input.team.spent, currency)],
          [copy.projected, money(input.team.projection, currency)],
          [copy.budget, money(input.team.budget, currency)],
        ]}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span id="pace-delta-label" className="text-sm font-medium">
            {copy.lever}
          </span>
          <span className="shrink-0 text-sm tabular-nums text-ink-secondary">
            {deltaLabel(Math.round(deltaPct))}
          </span>
        </div>
        <Slider
          aria-labelledby="pace-delta-label"
          min={LEVER_MIN}
          max={LEVER_MAX}
          step={5}
          value={deltaPct}
          onValueChange={onDeltaChange}
          getAriaValueText={(_, value) => deltaLabel(Math.round(value))}
          className="h-11"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-11 sm:h-7"
            onClick={() => onDeltaChange(0)}
          >
            {copy.presetCurrent}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-11 sm:h-7"
            disabled={breakEvenPct === null}
            onClick={() => breakEvenPct !== null && onDeltaChange(breakEvenPct)}
          >
            {copy.presetBreakEven}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-11 sm:h-7"
            onClick={() => onDeltaChange(FIXED_CUT)}
          >
            {copy.presetCut}
          </Button>
        </div>
        {breakEvenPct === null && (
          <p className="text-xs text-muted-foreground">{copy.breakEvenUnreachable}</p>
        )}
      </div>

      {hasSpend && (
        <ScenarioChart
          rows={chartRows}
          budget={input.team.budget}
          projection={input.team.projection}
          simulatedClose={result.team.close}
          yMax={yMax}
          currency={currency}
        />
      )}

      <div className="rounded-md border bg-muted p-4">
        <p className="label-caps text-muted-foreground">
          {copy.resultTitle}
        </p>
        <dl className="mt-3 flex flex-col gap-4 text-sm">
          <OutcomeRow
            label={copy.teamCloses}
            outcome={result.team}
            currency={currency}
            versus={copy.teamVsBudget}
          />
          <OutcomeRow
            label={copy.orgCloses}
            outcome={result.org}
            currency={currency}
            versus={copy.orgVsBudget}
          />
        </dl>
      </div>

      <p className="text-xs/relaxed text-muted-foreground">{copy.disclaimer}</p>
    </div>
  );
}

/** One scope's close + its own-budget margin — team and company are judged
 *  separately so a green company line can never mask a breached team (QA-04). */
function OutcomeRow({
  label,
  outcome,
  currency,
  versus,
}: {
  label: string;
  outcome: ScopeOutcome;
  currency: string;
  versus: (delta: string) => string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="text-lg font-medium tabular-nums">
          {money(outcome.close, currency)}
        </dd>
      </div>
      <p className="text-right text-xs/relaxed text-muted-foreground tabular-nums">
        {versus(signedMoney(-outcome.margin, currency))}
      </p>
    </div>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <div>
      <p className="label-caps text-muted-foreground">
        {copy.currentPace}
      </p>
      <dl className="mt-2 flex flex-col gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
