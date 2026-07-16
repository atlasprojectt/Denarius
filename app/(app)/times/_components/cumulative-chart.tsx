"use client";

import { useId } from "react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { expectedPaceSegment, type CumulativePoint } from "@/lib/engine/cumulative";
import { compactMoney, money } from "@/lib/money";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

// The cumulative spend-vs-budget line (frontend §6, the F3 Recharts chart),
// now the "Ritmo diário" block of a team's diagnosis card: the team's real
// day-by-day spend, the budget reference, the expected-pace diagonal (budget
// spread evenly across the days — where the eye spots the detachment) and the
// dashed projection tail to the period close. Budget-less teams chart spend
// alone. All numbers are engine-provided (buildCumulativeSpend,
// expectedPaceSegment + the team evaluation); this component only draws.
// Pace/budget references are neutral — semaphore is budget status only (P5).

const copy = {
  spent: "Gasto",
  projected: "Projeção",
  budget: "Orçamento",
  pace: "ritmo esperado",
  today: "hoje",
  dayTick: (day: number) => `dia ${day}`,
};

const chartConfig = {
  // chart-1, not primary: same lighter brand orange as the Home pace line —
  // the deep primary reads too close to the status red on adjacent cards.
  spent: { label: copy.spent, color: "var(--chart-1)" },
  projected: {
    label: copy.projected,
    color: "color-mix(in oklab, var(--chart-1) 55%, transparent)",
  },
} satisfies ChartConfig;

type ChartRow = { day: number; spent: number };

function buildRows(points: CumulativePoint[]): ChartRow[] {
  return points.map((p) => ({ day: p.day, spent: p.spent }));
}

function buildProjectionSegment(
  points: CumulativePoint[],
  projection: number | null,
  daysInPeriod: number,
) {
  const last = points.at(-1);
  if (last && projection !== null && daysInPeriod > last.day) {
    return [
      { x: last.day, y: last.spent },
      { x: daysInPeriod, y: projection },
    ] as const;
  }
  return null;
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
  /** null for a team without a budget — the chart shows spend alone. */
  budget: number | null;
  currency: string;
  dayOfPeriod: number;
  daysInPeriod: number;
  emptyLabel: string;
}) {
  // One chart per team card on the same page — the SVG gradient id must be
  // unique per instance or every chart resolves to the first one's def.
  const fillId = useId();
  const hasSpend = points.some((p) => p.spent > 0);
  const rows = buildRows(points);
  const projectionSegment = buildProjectionSegment(
    points,
    projection,
    daysInPeriod,
  );
  const pace = expectedPaceSegment(budget, daysInPeriod);
  const maxY =
    Math.max(budget ?? 0, projection ?? 0, points.at(-1)?.spent ?? 0, 1) * 1.08;
  const ticks = [1, dayOfPeriod, daysInPeriod].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const tickLabel = (value: number) =>
    value === dayOfPeriod && value !== daysInPeriod
      ? copy.today
      : copy.dayTick(value);

  if (!hasSpend) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div data-reveal="cumulative" suppressHydrationWarning>
      <div data-reveal-wipe>
        {/* debounce: stretch-while-frozen during continuous resizes
            (sidebar collapse) instead of per-frame re-renders. */}
        <ChartContainer
          config={chartConfig}
          debounce={80}
          className="h-[220px] w-full overflow-hidden"
        >
          <ComposedChart
            accessibilityLayer
            data={rows}
            margin={{ top: 16, right: 16, bottom: 4, left: 8 }}
          >
            <defs>
              {/* Orange fill under the realized line only; fades out and ends
                  where the projection tail begins. */}
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-spent)"
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-spent)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              type="number"
              domain={[1, daysInPeriod]}
              ticks={ticks}
              tickFormatter={tickLabel}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[0, maxY]}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              width={72}
              tickFormatter={(value: number) => compactMoney(value, currency)}
            />
            {pace !== null && (
              /* Expected pace: the budget spread evenly over the days — a
                 neutral, finely dotted diagonal so real spend visibly detaches
                 from plan. Never semaphore-colored. */
              <ReferenceLine
                segment={[
                  { x: pace.start.day, y: pace.start.spent },
                  { x: pace.end.day, y: pace.end.spent },
                ]}
                stroke="var(--muted-foreground)"
                strokeDasharray="2 5"
                strokeOpacity={0.5}
                label={{
                  value: copy.pace,
                  position: "center",
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                  dy: -8,
                }}
              />
            )}
            {budget !== null && (
              <ReferenceLine
                y={budget}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                strokeOpacity={0.45}
                label={{
                  value: copy.budget,
                  position: "insideBottomRight",
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                  dy: -6,
                }}
              />
            )}
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(_, payload) =>
                    copy.dayTick(Number(payload?.[0]?.payload?.day ?? 0))
                  }
                  formatter={(value, name) => (
                    <div className="flex min-w-[10rem] items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {String(name) === "projected"
                          ? copy.projected
                          : copy.spent}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
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
              stroke="none"
              fill={`url(#${fillId})`}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="spent"
              type="monotone"
              stroke="var(--color-spent)"
              strokeWidth={3}
              strokeLinecap="round"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            {projectionSegment ? (
              <>
                {/* Boundary marker where realized spend ends and the
                    projection begins. */}
                <ReferenceLine
                  x={dayOfPeriod}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="2 3"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  segment={projectionSegment}
                  stroke="var(--color-projected)"
                  strokeWidth={3}
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                />
              </>
            ) : null}
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  );
}
