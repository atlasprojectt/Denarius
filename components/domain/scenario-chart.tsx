"use client";

import {
  Label,
  ReferenceDot,
  ReferenceLine,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";

import {
  CHART_ANNOTATION_Z_INDEX,
  SpendTrendChart,
  type TrendLine,
} from "@/components/domain/spend-trend-chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { ScenarioComparisonRow } from "@/lib/engine/cumulative";
import { compactMoney, money } from "@/lib/money";

// The simulator drawer's picture of the lever: realized spend up to today,
// then two paths to the close — the current pace (quiet dashes) and the
// scenario (strong dashes) — against the team budget as a flat ruler. It draws
// engine rows only (invariant #2) and never colors by status: the outcome is
// a hypothesis, stated in the figures below the chart (principle #5).

const copy = {
  spent: "Realizado",
  projected: "Ritmo atual",
  simulated: "Cenário",
  budget: "Orçamento",
  budgetLine: (value: string) => `Orçamento · ${value}`,
  dayTick: (day: number) => `dia ${day}`,
  aria: (projected: string, simulated: string, budget: string) =>
    `Gráfico do cenário: no ritmo atual o time fecha em ${projected}; no cenário, em ${simulated}; orçamento de ${budget}.`,
};

const chartConfig = {
  spent: { label: copy.spent, color: "var(--foreground)" },
  projected: {
    label: copy.projected,
    color: "color-mix(in oklab, var(--foreground) 42%, transparent)",
  },
  simulated: { label: copy.simulated, color: "var(--foreground)" },
} satisfies ChartConfig;

const PROJECTED_DASH = "5 5";
const SIMULATED_DASH = "7 4";
const BUDGET_DASH = "2 4";

const trendLines: TrendLine[] = [
  { key: "projected", dash: PROJECTED_DASH, width: 1.5 },
  { key: "simulated", dash: SIMULATED_DASH, width: 2.25 },
];

function xTicks(daysInPeriod: number): number[] {
  return [
    ...[1, 10, 20].filter((day) => day < daysInPeriod),
    daysInPeriod,
  ];
}

export function ScenarioChart({
  rows,
  budget,
  projection,
  simulatedClose,
  yMax,
  currency,
}: {
  rows: ScenarioComparisonRow[];
  budget: number;
  projection: number;
  simulatedClose: number;
  /** Fixed by the caller to the lever's full range, so dragging moves the
   *  line and never rescales the axis under it. */
  yMax: number;
  currency: string;
}) {
  const daysInPeriod = rows.length;
  const today = rows.findLast((row) => row.spent !== null);

  return (
    <figure className="flex flex-col gap-3 [--chart-surface:var(--popover)]">
      <figcaption className="sr-only">
        {copy.aria(
          money(projection, currency),
          money(simulatedClose, currency),
          money(budget, currency),
        )}
      </figcaption>
      <SpendTrendChart
        className="h-[200px]"
        rows={rows}
        xKey="day"
        xDomain={[1, daysInPeriod]}
        xTicks={xTicks(daysInPeriod)}
        todayDay={today?.day ?? null}
        yMax={yMax}
        yTickFormatter={(value) => compactMoney(value, currency)}
        config={chartConfig}
        areaKey="spent"
        lines={trendLines}
        pillLabel={(day) => copy.dayTick(day)}
        renderTooltip={(tooltipProps) => (
          <ScenarioTooltip {...tooltipProps} currency={currency} />
        )}
      >
        <ReferenceLine
          zIndex={CHART_ANNOTATION_Z_INDEX}
          y={budget}
          stroke="var(--muted-foreground)"
          strokeDasharray={BUDGET_DASH}
          strokeWidth={1.25}
        >
          <Label
            value={copy.budgetLine(compactMoney(budget, currency, 2))}
            position="insideBottomLeft"
            offset={6}
            fill="var(--muted-foreground)"
            fontSize={11}
            fontWeight={500}
          />
        </ReferenceLine>
        {today?.spent != null && (
          <ReferenceDot
            zIndex={CHART_ANNOTATION_Z_INDEX}
            x={today.day}
            y={today.spent}
            r={3.5}
            fill="var(--chart-surface, var(--background))"
            stroke="var(--foreground)"
            strokeWidth={2}
          />
        )}
        <ReferenceDot
          zIndex={CHART_ANNOTATION_Z_INDEX}
          x={daysInPeriod}
          y={simulatedClose}
          r={4.5}
          fill="var(--foreground)"
          stroke="var(--chart-surface, var(--background))"
          strokeWidth={1.5}
          ifOverflow="visible"
        />
      </SpendTrendChart>
      <Legend />
    </figure>
  );
}

function Legend() {
  return (
    <ul
      aria-hidden
      className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
    >
      <LegendItem label={copy.spent} stroke="var(--foreground)" />
      <LegendItem
        label={copy.projected}
        stroke={chartConfig.projected.color}
        dash={PROJECTED_DASH}
      />
      <LegendItem
        label={copy.simulated}
        stroke="var(--foreground)"
        dash={SIMULATED_DASH}
        width={2.25}
      />
      <LegendItem
        label={copy.budget}
        stroke="var(--muted-foreground)"
        dash={BUDGET_DASH}
      />
    </ul>
  );
}

function LegendItem({
  label,
  stroke,
  dash,
  width = 1.75,
}: {
  label: string;
  stroke: string;
  dash?: string;
  width?: number;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <svg width="18" height="6" viewBox="0 0 18 6" className="shrink-0">
        <line
          x1="1"
          x2="17"
          y1="3"
          y2="3"
          stroke={stroke}
          strokeWidth={width}
          strokeDasharray={dash}
          strokeLinecap="round"
        />
      </svg>
      {label}
    </li>
  );
}

function ScenarioTooltip({
  active,
  payload,
  currency,
}: TooltipContentProps<TooltipValueType, string | number> & {
  currency: string;
}) {
  if (!active || !payload.length) return null;

  const row = payload[0]?.payload as ScenarioComparisonRow | undefined;
  if (!row) return null;

  return (
    <div className="min-w-48">
      <p className="mb-1.5 pl-0.5 text-xs font-medium text-foreground">
        {copy.dayTick(row.day)}
      </p>
      <div className="rounded-md border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-lg">
        <dl className="grid grid-cols-[1fr_auto] gap-x-5 gap-y-1.5">
          {row.spent !== null && (
            <TooltipRow label={copy.spent} value={money(row.spent, currency)} />
          )}
          {row.spent === null && row.projected !== null && (
            <TooltipRow
              label={copy.projected}
              value={money(row.projected, currency)}
              muted
            />
          )}
          {row.spent === null && row.simulated !== null && (
            <TooltipRow
              label={copy.simulated}
              value={money(row.simulated, currency)}
            />
          )}
        </dl>
      </div>
    </div>
  );
}

function TooltipRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`text-right tabular-nums ${muted ? "text-muted-foreground" : "font-medium text-popover-foreground"}`}
      >
        {value}
      </dd>
    </>
  );
}
