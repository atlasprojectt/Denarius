"use client";

import { motion, useReducedMotion } from "motion/react";
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
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { homeCopy } from "./copy";

// "Ritmo do mês" (frontend §3.8): the cumulative spend line vs the budget
// reference, with the linear projection dashed. A full-width analysis card in
// the redesigned cockpit — the numbers themselves live in the hero, so this
// card carries only the trajectory (no KPI footer).

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
  const reduceMotion = useReducedMotion();
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
          <motion.div
            className="overflow-hidden"
            initial={
              reduceMotion
                ? false
                : { clipPath: "inset(0 100% 0 0)", opacity: 0.7 }
            }
            animate={
              reduceMotion
                ? undefined
                : { clipPath: "inset(0 0% 0 0)", opacity: 1 }
            }
            transition={{
              duration: 0.92,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <ChartContainer
              config={chartConfig}
              className="h-[240px] w-full"
            >
              <LineChart
                accessibilityLayer
                data={data}
                margin={{ top: 16, right: 16, bottom: 4, left: 8 }}
              >
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
                  tickFormatter={(value: number) => compactMoney(value, currency)}
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
                            {String(name) === "projected" ? c.projected : c.spent}
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
                  strokeLinecap="round"
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                {projectionSegment ? (
                  <ReferenceLine
                    segment={projectionSegment}
                    stroke="var(--color-projected)"
                    strokeWidth={3}
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                  />
                ) : null}
              </LineChart>
            </ChartContainer>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
