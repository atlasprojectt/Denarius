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
import type { BudgetEvaluation } from "@/lib/engine/budget";
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
import { homeCopy } from "./copy";

// "Ritmo do mês" (frontend §3.8): the cumulative spend line vs the budget
// reference, with the linear projection dashed. A full-width analysis card in
// the redesigned cockpit — the numbers themselves live in the hero, so this
// card carries only the trajectory (no KPI footer).

// Gradient fill under the realized line + a boundary marker where the
// projection begins (2026-07-12).
const c = homeCopy.monthlyPace;

const chartConfig = {
  spent: { label: c.spent, color: "var(--primary)" },
  projected: { label: c.projected, color: "color-mix(in oklab, var(--primary) 55%, transparent)" },
  budget: { label: c.budget, color: "var(--muted-foreground)" },
} satisfies ChartConfig;

type PacePoint = { marker: string; x: number; spent: number };

function buildPaceData(org: BudgetEvaluation): PacePoint[] {
  return [
    { marker: c.start, x: 0, spent: 0 },
    { marker: c.today, x: org.pctElapsed, spent: org.spent },
  ];
}

function buildProjectionSegment(org: BudgetEvaluation) {
  if (org.projection === null || org.pctElapsed >= 1) return null;
  return [
    { x: org.pctElapsed, y: org.spent },
    { x: 1, y: org.projection },
  ] as const;
}

export function MonthlyPaceChart({
  org,
  currency,
}: {
  org: BudgetEvaluation;
  currency: string;
}) {
  const data = buildPaceData(org);
  const projectionSegment = buildProjectionSegment(org);
  const maxY = Math.max(org.budget, org.spent, org.projection ?? 0, 1) * 1.08;
  const ticks = [0, org.pctElapsed, 1].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const tickLabel = (value: number) => {
    if (value === 0) return c.start;
    if (value === 1) return c.close;
    return c.today;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{c.title}</CardTitle>
        <CardDescription>{c.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {org.spent <= 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {c.empty}
          </p>
        ) : (
          <div data-home-animate="monthly-pace">
            <div data-home-chart-reveal>
              <ChartContainer
                config={chartConfig}
                className="h-[240px] w-full"
              >
                <ComposedChart
                  accessibilityLayer
                  data={data}
                  margin={{ top: 16, right: 16, bottom: 4, left: 8 }}
                >
                  <defs>
                    {/* Orange fill under the REALIZED line only — it fades to
                        transparent and (because `spent` stops at today) ends
                        exactly where the projection begins. */}
                    <linearGradient id="pace-fill" x1="0" y1="0" x2="0" y2="1">
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
                    dataKey="x"
                    type="number"
                    domain={[0, 1]}
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
                    tickFormatter={(value: number) =>
                      compactMoney(value, currency)
                    }
                  />
                  <ReferenceLine
                    y={org.budget}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.45}
                    label={{
                      value: c.budget,
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
                        formatter={(value, name) => (
                          <div className="flex min-w-[10rem] items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              {String(name) === "projected"
                                ? c.projected
                                : c.spent}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {money(Number(value), currency)}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  {/* Gradient fill sits under the realized line (drawn first,
                      so the solid line reads on top with strong contrast). */}
                  <Area
                    dataKey="spent"
                    type="monotone"
                    stroke="none"
                    fill="url(#pace-fill)"
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
                      {/* Boundary: exactly where realized spend ends and the
                          projection (simulação de gastos) begins. */}
                      <ReferenceLine
                        x={org.pctElapsed}
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
        )}
      </CardContent>
    </Card>
  );
}
