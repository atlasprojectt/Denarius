"use client";

import { useId } from "react";

import {
  SpendAreaGradient,
  SpendChartGrid,
} from "@/components/domain/spend-chart-visuals";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  expectedPaceSegment,
  type CumulativePoint,
} from "@/lib/engine/cumulative";
import { compactMoney, money } from "@/lib/money";
import {
  Area,
  ComposedChart,
  Label,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

const copy = {
  spent: "Realizado",
  projected: "Projeção",
  budget: "Orçamento",
  pace: "Ritmo esperado",
  today: (value: string) => `Hoje · ${value}`,
  budgetValue: (value: string) => `Orçamento · ${value}`,
  dayTick: (day: number) => `dia ${day}`,
};

const chartConfig = {
  spent: { label: copy.spent, color: "var(--brand-accent)" },
  projected: {
    label: copy.projected,
    color: "color-mix(in oklab, var(--brand-accent) 58%, transparent)",
  },
} satisfies ChartConfig;

function projectionSegment(
  points: CumulativePoint[],
  projection: number | null,
  daysInPeriod: number,
) {
  const last = points.at(-1);
  if (!last || projection === null || daysInPeriod <= last.day) return null;
  return [
    { x: last.day, y: last.spent },
    { x: daysInPeriod, y: projection },
  ] as const;
}

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
  dayOfPeriod,
  daysInPeriod,
  emptyLabel,
}: {
  points: CumulativePoint[];
  projection: number | null;
  budget: number | null;
  currency: string;
  dayOfPeriod: number;
  daysInPeriod: number;
  emptyLabel: string;
}) {
  const fillId = useId().replace(/:/g, "");
  const today = points.at(-1);
  const hasSpend = points.some((point) => point.spent > 0);
  const projected = projectionSegment(points, projection, daysInPeriod);
  const pace = expectedPaceSegment(budget, daysInPeriod);
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
            data={points}
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

            {pace && (
              <ReferenceLine
                segment={[
                  { x: pace.start.day, y: pace.start.spent },
                  { x: pace.end.day, y: pace.end.spent },
                ]}
                stroke="var(--muted-foreground)"
                strokeDasharray="2 6"
                strokeOpacity={0.34}
                strokeWidth={1}
                label={{
                  value: copy.pace,
                  position: "center",
                  fill: "var(--muted-foreground)",
                  fontSize: 10,
                  dy: -8,
                }}
              />
            )}

            {budget !== null && budget > 0 && (
              <ReferenceLine
                y={budget}
                stroke="var(--muted-foreground)"
                strokeDasharray="7 5"
                strokeOpacity={0.46}
                strokeWidth={1}
                label={{
                  value: copy.budgetValue(compactMoney(budget, currency, 2)),
                  position: "insideTopRight",
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                  dy: -6,
                }}
              />
            )}

            <ChartTooltip
              cursor={{
                stroke: "var(--muted-foreground)",
                strokeDasharray: "3 3",
                strokeOpacity: 0.5,
                strokeWidth: 1,
              }}
              isAnimationActive="auto"
              animationDuration={160}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(_, payload) =>
                    copy.dayTick(Number(payload?.[0]?.payload?.day ?? 0))
                  }
                  formatter={(value) => (
                    <div className="flex min-w-[10rem] items-center justify-between gap-4">
                      <span className="text-muted-foreground">{copy.spent}</span>
                      <span className="font-medium tabular-nums">
                        {money(Number(value), currency)}
                      </span>
                    </div>
                  )}
                />
              }
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

            {projected && (
              <ReferenceLine
                segment={projected}
                stroke="var(--color-projected)"
                strokeWidth={1.8}
                strokeDasharray="6 6"
                strokeLinecap="round"
              />
            )}

            <ReferenceLine
              x={dayOfPeriod}
              stroke="var(--muted-foreground)"
              strokeDasharray="2 4"
              strokeOpacity={0.44}
              strokeWidth={1}
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
            {projected && projection !== null && (
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
