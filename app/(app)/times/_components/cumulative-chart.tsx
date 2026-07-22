"use client";

import { useId } from "react";

import {
  SpendAreaGradient,
  SpendChartGrid,
} from "@/components/domain/spend-chart-visuals";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  buildCumulativeComparison,
  type CumulativeComparisonRow,
  type CumulativePoint,
} from "@/lib/engine/cumulative";
import { compactMoney, money } from "@/lib/money";
import {
  Area,
  ComposedChart,
  Label,
  Line,
  ReferenceDot,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";

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
  const fillId = useId().replace(/:/g, "");
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
      <div data-reveal-wipe>
        <ChartContainer
          config={chartConfig}
          debounce={80}
          className="h-[280px] w-full overflow-hidden"
        >
          <ComposedChart
            accessibilityLayer
            data={rows}
            margin={{ top: 30, right: 28, bottom: 6, left: 4 }}
          >
            <SpendChartGrid />
            <SpendAreaGradient id={fillId} />

            <XAxis
              dataKey="day"
              type="number"
              domain={[1, daysInPeriod]}
              ticks={xTicks(daysInPeriod)}
              tickLine={false}
              axisLine={{ stroke: "var(--border)", strokeOpacity: 0.65 }}
              tickMargin={8}
              minTickGap={24}
              allowDecimals={false}
            />
            <YAxis
              domain={[0, maxY]}
              tickCount={5}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              width={68}
              tickFormatter={(value: number) => compactMoney(value, currency)}
            />

            <ChartTooltip
              cursor={{
                stroke: "var(--muted-foreground)",
                strokeDasharray: "3 3",
                strokeOpacity: 0.5,
                strokeWidth: 1,
              }}
              isAnimationActive="auto"
              animationDuration={160}
              content={(tooltipProps) => (
                <ComparisonTooltip {...tooltipProps} currency={currency} />
              )}
            />

            <Area
              dataKey="spent"
              type="monotone"
              stroke="var(--color-spent)"
              strokeWidth={2.25}
              strokeLinecap="round"
              fill={`url(#${fillId})`}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={{
                r: 4,
                fill: "var(--background)",
                stroke: "var(--brand-accent)",
                strokeWidth: 2.25,
              }}
            />

            <Line
              dataKey="projected"
              type="monotone"
              stroke="var(--color-projected)"
              strokeWidth={1.8}
              strokeDasharray="6 6"
              strokeLinecap="round"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
            <Line
              dataKey="pace"
              type="monotone"
              stroke="var(--color-pace)"
              strokeWidth={1.15}
              strokeDasharray="2 6"
              strokeLinecap="round"
              strokeOpacity={0.42}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />

            <ReferenceDot
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
                x={daysInPeriod}
                y={projection}
                r={3.5}
                fill="var(--brand-accent)"
                fillOpacity={0.7}
                stroke="var(--background)"
                strokeWidth={1.25}
              />
            )}
          </ComposedChart>
        </ChartContainer>
      </div>
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
    <div className="min-w-52 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-50 shadow-lg">
      <p className="mb-2 font-medium">{copy.dayTick(row.day)}</p>
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
