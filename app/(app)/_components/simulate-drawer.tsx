"use client";

import { useState } from "react";
import { SlidersHorizontalIcon } from "@phosphor-icons/react";

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
} from "@/lib/engine/scenario";
import { money } from "@/lib/money";
import { percent } from "@/lib/format";
import { homeCopy } from "./copy";

// The contextual scenario simulator (#21, PRD story 36): a right-side drawer
// opened from a team row with that team pre-loaded. One lever — the team's
// remaining pace — recomputed instantly on the client by the pure engine
// (lib/engine/scenario.ts). No LLM, no round-trip; estimates, disclosed.

const c = homeCopy.simulate;

const FIXED_CUT = -30; // the "−30%" preset, whole percent

export type SimulateDrawerProps = {
  teamName: string;
  currency: string;
  team: { spent: number; projection: number | null; budget: number };
  org: { projection: number | null; budget: number };
};

function deltaLabel(deltaPct: number): string {
  const formatted = percent(Math.abs(deltaPct) / 100);
  if (deltaPct === 0) return c.deltaZero;
  return deltaPct < 0 ? c.deltaSlower(formatted) : c.deltaFaster(formatted);
}

export function SimulateDrawer(props: SimulateDrawerProps) {
  const { teamName, currency, team, org } = props;
  const [deltaPct, setDeltaPct] = useState(0);

  // Before day 5 the projection guard holds — nothing honest to simulate.
  const collecting = team.projection === null || org.projection === null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontalIcon className="size-4" />
          {c.title}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{c.title}</SheetTitle>
          <SheetDescription>{c.subtitle(teamName)}</SheetDescription>
        </SheetHeader>

        {collecting ? (
          <div className="flex flex-col gap-3 p-4">
            <Facts
              rows={[
                [c.spent, money(team.spent, currency)],
                [c.budget, money(team.budget, currency)],
              ]}
            />
            <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              {c.collecting}
            </p>
          </div>
        ) : (
          <Simulation
            input={{
              org: { budget: org.budget, projection: org.projection as number },
              team: { spent: team.spent, projection: team.projection as number },
            }}
            teamBudget={team.budget}
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
  teamBudget,
  currency,
  deltaPct,
  onDeltaChange,
}: {
  input: ScenarioInput;
  teamBudget: number;
  currency: string;
  deltaPct: number;
  onDeltaChange: (value: number) => void;
}) {
  const result = simulatePace(input, deltaPct / 100);
  const breakEven = breakEvenDelta(input);
  const breakEvenPct =
    breakEven.reachable && breakEven.delta !== null
      ? Math.round(breakEven.delta * 100)
      : null;

  return (
    <div className="flex flex-col gap-5 p-4">
      <Facts
        rows={[
          [c.spent, money(input.team.spent, currency)],
          [c.projected, money(input.team.projection, currency)],
          [c.budget, money(teamBudget, currency)],
        ]}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="pace-delta" className="text-sm font-medium">
            {c.lever}
          </label>
          <span className="text-sm tabular-nums text-muted-foreground">
            {deltaLabel(deltaPct)}
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
            {c.presetCurrent}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={breakEvenPct === null}
            onClick={() => breakEvenPct !== null && onDeltaChange(breakEvenPct)}
          >
            {c.presetBreakEven}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeltaChange(FIXED_CUT)}
          >
            {c.presetCut}
          </Button>
        </div>
        {breakEvenPct === null && (
          <p className="text-xs text-muted-foreground">{c.breakEvenUnreachable}</p>
        )}
      </div>

      <div className="rounded-lg border p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {c.resultTitle}
        </p>
        <dl className="mt-2 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{c.teamCloses}</dt>
            <dd className="tabular-nums font-medium">
              {money(result.teamClose, currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{c.orgCloses}</dt>
            <dd className="tabular-nums font-medium">
              {money(result.orgClose, currency)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm">
          {result.withinBudget
            ? c.marginUnder(money(result.orgMargin, currency))
            : c.marginOver(money(-result.orgMargin, currency))}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">{c.disclaimer}</p>
    </div>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {c.currentPace}
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
