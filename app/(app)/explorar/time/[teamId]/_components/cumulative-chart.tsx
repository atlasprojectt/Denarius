"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CumulativePoint } from "@/lib/engine/cumulative";
import { compactMoney, money } from "@/lib/money";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

// The cumulative spend-vs-budget line (frontend §6, the F3 Recharts chart):
// the team's real day-by-day spend, the budget reference and the dashed
// projection tail to the period close. All numbers are engine-provided
// (buildCumulativeSpend + the team evaluation); this component only draws.

const copy = {
  title: "Ritmo do time",
  subtitle:
    "Gasto acumulado dia a dia contra o orçamento — a linha tracejada é a projeção de fechamento.",
  empty: "Sem gasto registrado neste período ainda.",
  spent: "Gasto",
  projected: "Projeção",
  budget: "Orçamento",
  today: "hoje",
  dayTick: (day: number) => `dia ${day}`,
};

const chartConfig = {
  spent: { label: copy.spent, color: "var(--primary)" },
  projected: {
    label: copy.projected,
    color: "color-mix(in oklab, var(--primary) 55%, transparent)",
  },
} satisfies ChartConfig;

type ChartRow = { day: number; spent: number };
type ProjectionRow = { day: number; projected: number };

function buildRows(points: CumulativePoint[]): ChartRow[] {
  return points.map((p) => ({ day: p.day, spent: p.spent }));
}

function buildProjectionRows(
  points: CumulativePoint[],
  projection: number | null,
  daysInPeriod: number,
): ProjectionRow[] {
  const last = points.at(-1);
  if (last && projection !== null && daysInPeriod > last.day) {
    return [
      { day: last.day, projected: last.spent },
      { day: daysInPeriod, projected: projection },
    ];
  }
  return [];
}

export function CumulativeChart({
  points,
  projection,
  budget,
  currency,
  dayOfPeriod,
  daysInPeriod,
}: {
  points: CumulativePoint[];
  projection: number | null;
  budget: number;
  currency: string;
  dayOfPeriod: number;
  daysInPeriod: number;
}) {
  const hasSpend = points.some((p) => p.spent > 0);
  const rows = buildRows(points);
  const projectionRows = buildProjectionRows(points, projection, daysInPeriod);
  const maxY =
    Math.max(budget, projection ?? 0, points.at(-1)?.spent ?? 0, 1) * 1.08;
  const ticks = [1, dayOfPeriod, daysInPeriod].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const tickLabel = (value: number) =>
    value === dayOfPeriod && value !== daysInPeriod
      ? copy.today
      : copy.dayTick(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{copy.title}</CardTitle>
        <CardDescription>{copy.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasSpend ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {copy.empty}
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <LineChart
              accessibilityLayer
              data={rows}
              margin={{ top: 16, right: 16, bottom: 4, left: 8 }}
            >
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
              <Line
                dataKey="spent"
                type="monotone"
                stroke="var(--color-spent)"
                strokeWidth={3}
                dot={false}
                connectNulls={false}
              />
              <Line
                data={projectionRows}
                dataKey="projected"
                type="linear"
                stroke="var(--color-projected)"
                strokeWidth={3}
                strokeDasharray="6 6"
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
