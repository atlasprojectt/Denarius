"use client";

import { useState } from "react";
import { RiEqualizer2Line } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  breakEvenDelta,
  simulatePace,
  type ScenarioInput,
  type ScopeOutcome,
} from "@/lib/engine/scenario";
import { money } from "@/lib/money";
import { percent } from "@/lib/format";

// The contextual scenario simulator (#21, PRD story 36): a right-side drawer
// opened from a team with that team pre-loaded (domain component, frontend
// F5). One lever — the team's remaining pace — recomputed instantly on the
// client by the pure engine (lib/engine/scenario.ts). No LLM, no round-trip;
// estimates, disclosed. Team and company outcomes are stated SEPARATELY, each
// against its own budget (2026-07-11 audit, QA-04), and the "fechar no
// orçamento" preset targets the TEAM's budget with the exact delta — no
// rounding drift between the preset and the numbers shown (QA-10).

const copy = {
  title: "Simular",
  subtitle: (team: string) => `Cenário para ${team}`,
  currentPace: "Ritmo atual",
  spent: "Gasto até agora",
  projected: "Projeção de fechamento",
  budget: "Orçamento do time",
  lever: "Variação do ritmo do time até o fim do mês",
  deltaZero: "ritmo atual",
  deltaSlower: (pct: string) => `${pct} mais devagar`,
  deltaFaster: (pct: string) => `${pct} mais rápido`,
  presetCurrent: "Ritmo atual",
  presetBreakEven: "Fechar no orçamento",
  presetCut: "−30%",
  breakEvenUnreachable:
    "O gasto já realizado passa do orçamento do time — nem parando agora este time fecha dentro. O ajuste passa pelo orçamento ou por outros times.",
  resultTitle: "Neste cenário",
  teamCloses: "Time fecha em",
  orgCloses: "Empresa fecha em",
  teamUnder: (amount: string) => `${amount} abaixo do orçamento do time.`,
  teamOver: (amount: string) => `${amount} acima do orçamento do time.`,
  orgUnder: (amount: string) => `${amount} abaixo do orçamento da empresa.`,
  orgOver: (amount: string) => `${amount} acima do orçamento da empresa.`,
  collecting:
    "Coletando ritmo — a simulação usa a projeção de fechamento, disponível a partir do dia 5 do período.",
  disclaimer:
    "Estimativa linear sobre o ritmo atual — não é uma previsão. O Denarius aponta; a decisão é sua.",
};

const FIXED_CUT = -30; // the "−30%" preset, whole percent

export type SimulateDrawerProps = {
  teamName: string;
  currency: string;
  team: { spent: number; projection: number | null; budget: number };
  org: { projection: number | null; budget: number };
  triggerLabel?: string;
};

function deltaLabel(deltaPct: number): string {
  if (deltaPct === 0) return copy.deltaZero;
  const formatted = percent(Math.abs(deltaPct) / 100);
  return deltaPct < 0 ? copy.deltaSlower(formatted) : copy.deltaFaster(formatted);
}

export function SimulateDrawer(props: SimulateDrawerProps) {
  const { teamName, currency, team, org, triggerLabel = copy.title } = props;
  const [deltaPct, setDeltaPct] = useState(0);

  // Before day 5 the projection guard holds — nothing honest to simulate.
  const collecting = team.projection === null || org.projection === null;

  return (
    // Every open starts a fresh scenario — a stale slider from a previous
    // session could read as the current state.
    <Sheet onOpenChange={(open) => open && setDeltaPct(0)}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <RiEqualizer2Line className="size-4" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{copy.title}</SheetTitle>
          <SheetDescription>{copy.subtitle(teamName)}</SheetDescription>
        </SheetHeader>

        {collecting ? (
          <div className="flex flex-col gap-4 overflow-y-auto p-4">
            <Facts
              rows={[
                [copy.spent, money(team.spent, currency)],
                [copy.budget, money(team.budget, currency)],
              ]}
            />
            <p className="rounded-lg bg-muted/50 p-3 text-xs/relaxed text-muted-foreground">
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
  currency,
  deltaPct,
  onDeltaChange,
}: {
  input: ScenarioInput;
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

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-4">
      <Facts
        rows={[
          [copy.spent, money(input.team.spent, currency)],
          [copy.projected, money(input.team.projection, currency)],
          [copy.budget, money(input.team.budget, currency)],
        ]}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="pace-delta" className="text-sm font-medium">
            {copy.lever}
          </label>
          <span className="text-sm tabular-nums text-muted-foreground">
            {deltaLabel(Math.round(deltaPct))}
          </span>
        </div>
        <input
          id="pace-delta"
          type="range"
          min={-100}
          max={100}
          step={5}
          value={deltaPct}
          onChange={(e) => onDeltaChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onDeltaChange(0)}>
            {copy.presetCurrent}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={breakEvenPct === null}
            onClick={() => breakEvenPct !== null && onDeltaChange(breakEvenPct)}
          >
            {copy.presetBreakEven}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeltaChange(FIXED_CUT)}
          >
            {copy.presetCut}
          </Button>
        </div>
        {breakEvenPct === null && (
          <p className="text-xs text-muted-foreground">{copy.breakEvenUnreachable}</p>
        )}
      </div>

      <div className="rounded-lg border bg-muted/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {copy.resultTitle}
        </p>
        <dl className="mt-3 flex flex-col gap-4 text-sm">
          <OutcomeRow
            label={copy.teamCloses}
            outcome={result.team}
            currency={currency}
            under={copy.teamUnder}
            over={copy.teamOver}
          />
          <OutcomeRow
            label={copy.orgCloses}
            outcome={result.org}
            currency={currency}
            under={copy.orgUnder}
            over={copy.orgOver}
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
  under,
  over,
}: {
  label: string;
  outcome: ScopeOutcome;
  currency: string;
  under: (amount: string) => string;
  over: (amount: string) => string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="text-base font-semibold tabular-nums">
          {money(outcome.close, currency)}
        </dd>
      </div>
      <p className="text-right text-xs/relaxed text-muted-foreground tabular-nums">
        {outcome.withinBudget
          ? under(money(outcome.margin, currency))
          : over(money(-outcome.margin, currency))}
      </p>
    </div>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
