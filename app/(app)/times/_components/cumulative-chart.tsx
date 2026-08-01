"use client";

import {
  CHART_ANNOTATION_Z_INDEX,
  SpendTrendChart,
  type TrendLine,
} from "@/components/domain/spend-trend-chart";
import type { ChartConfig } from "@/components/ui/chart";
import {
  buildCumulativeComparison,
  type CumulativeComparisonRow,
  type CumulativePoint,
} from "@/lib/engine/cumulative";
import { compactMoney, money } from "@/lib/money";
import {
  Label,
  ReferenceDot,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";

// The team drill-down's cumulative view. Same chart grammar and hover focus as
// Home's "Evolução do mês" (both come from SpendTrendChart); what differs is the
// third series — this screen also plots the expected pace to compare against.

const copy = {
  spent: "Realizado",
  projected: "Projeção",
  budget: "Orçamento",
  pace: "Ritmo esperado",
  today: (value: string) => `Hoje · ${value}`,
  dayTick: (day: number) => `dia ${day}`,
};

const chartConfig = {
  spent: { label: copy.spent, color: "var(--brand-accent)" },
  projected: {
    label: copy.projected,
    color: "color-mix(in oklab, var(--brand-accent) 58%, transparent)",
  },
  pace: {
    label: copy.pace,
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

const trendLines: TrendLine[] = [
  { key: "projected", dash: "6 6", width: 1.8 },
  { key: "pace", dash: "2 6", width: 1.15, opacity: 0.42 },
];

function xTicks(daysInPeriod: number): number[] {
  return [
    ...[1, 5, 10, 15, 20, 25].filter((day) => day < daysInPeriod),
    daysInPeriod,
  ];
}

export function CumulativeChart({
  points,
  projection,
  budget,
  currency,
  daysInPeriod,
  emptyLabel,
}: {
  points: CumulativePoint[];
  projection: number | null;
  budget: number | null;
  currency: string;
  daysInPeriod: number;
  emptyLabel: string;
}) {
  const today = points.at(-1);
  const hasSpend = points.some((point) => point.spent > 0);
  const rows = buildCumulativeComparison({
    points,
    projection,
    budget,
    daysInPeriod,
  });
  const hasProjection = rows.some((row) => row.projected !== null);
  const maxY = Math.max(budget ?? 0, projection ?? 0, today?.spent ?? 0, 1) * 1.08;

  if (!hasSpend || !today) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div data-reveal="team-cumulative" suppressHydrationWarning>
      <SpendTrendChart
        data-reveal-wipe
        className="h-[280px] w-full"
        rows={rows}
        xKey="day"
        xDomain={[1, daysInPeriod]}
        xTicks={xTicks(daysInPeriod)}
        todayDay={today.day}
        yMax={maxY}
        yTickFormatter={(value) => compactMoney(value, currency)}
        config={chartConfig}
        areaKey="spent"
        lines={trendLines}
        pillLabel={(day) => copy.dayTick(day)}
        renderTooltip={(tooltipProps) => (
          <ComparisonTooltip {...tooltipProps} currency={currency} />
        )}
      >
        <ReferenceDot
          zIndex={CHART_ANNOTATION_Z_INDEX}
          x={today.day}
          y={today.spent}
          r={4}
          fill="var(--background)"
          stroke="var(--brand-accent)"
          strokeWidth={2.5}
        >
          <Label
            value={copy.today(compactMoney(today.spent, currency, 2))}
            position="top"
            offset={11}
            fill="var(--foreground)"
            fontSize={11}
            fontWeight={600}
          />
        </ReferenceDot>
        {hasProjection && projection !== null && (
          <ReferenceDot
            zIndex={CHART_ANNOTATION_Z_INDEX}
            x={daysInPeriod}
            y={projection}
            r={3.5}
            fill="var(--brand-accent)"
            fillOpacity={0.7}
            stroke="var(--background)"
            strokeWidth={1.25}
          />
        )}
      </SpendTrendChart>
    </div>
  );
}

function ComparisonTooltip({
  active,
  payload,
  currency,
}: TooltipContentProps<TooltipValueType, string | number> & {
  currency: string;
}) {
  if (!active || !payload.length) return null;

  const row = payload[0]?.payload as CumulativeComparisonRow | undefined;
  if (!row) return null;

  return (
    <div className="min-w-52">
      <p className="mb-1.5 pl-0.5 text-xs font-medium text-foreground">
        {copy.dayTick(row.day)}
      </p>
      <div className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-50 shadow-lg">
        <div className="grid grid-cols-[1fr_auto] gap-x-5 gap-y-1.5">
          {row.spent !== null && (
            <TooltipRow
              label={copy.spent}
              value={money(row.spent, currency)}
              tone="spent"
            />
          )}
          {row.projected !== null && row.spent === null && (
            <TooltipRow
              label={copy.projected}
              value={money(row.projected, currency)}
              tone="projected"
            />
          )}
          {row.pace !== null && (
            <TooltipRow
              label={copy.pace}
              value={money(row.pace, currency)}
              tone="pace"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TooltipRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "spent" | "projected" | "pace";
}) {
  const marker = {
    spent: "bg-brand-accent",
    projected: "bg-brand-accent/60",
    pace: "bg-zinc-500",
  }[tone];

  return (
    <>
      <span className="flex items-center gap-1.5 text-zinc-400">
        <span aria-hidden className={`size-2 rounded-full ${marker}`} />
        {label}
      </span>
      <span className="text-right font-medium tabular-nums text-zinc-50">
        {value}
      </span>
    </>
  );
}
