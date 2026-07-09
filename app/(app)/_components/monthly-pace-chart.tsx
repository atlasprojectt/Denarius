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
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { homeCopy } from "./copy";

const c = homeCopy.monthlyPace;

const chartConfig = {
  spent: { label: c.spent, color: "var(--primary)" },
  projected: { label: c.projected, color: "color-mix(in oklab, var(--primary) 55%, transparent)" },
  budget: { label: c.budget, color: "var(--muted-foreground)" },
} satisfies ChartConfig;

function buildPaceData(org: BudgetEvaluation) {
  const projection = org.projection ?? org.spent;
  const close = org.collecting ? null : projection;
  return [
    { marker: c.start, x: 0, spent: 0, projected: null },
    { marker: c.today, x: org.pctElapsed, spent: org.spent, projected: org.spent },
    { marker: c.close, x: 1, spent: null, projected: close },
  ];
}

export function MonthlyPaceChart({
  org,
  currency,
}: {
  org: BudgetEvaluation;
  currency: string;
}) {
  const data = buildPaceData(org);
  const maxY = Math.max(org.budget, org.spent, org.projection ?? 0, 1) * 1.08;
  const ticks = [0, org.pctElapsed, 1];
  const tickLabel = (value: number) => {
    if (value === 0) return c.start;
    if (value === 1) return c.close;
    return c.today;
  };

  return (
    <Card className="min-h-full">
      <CardHeader>
        <CardTitle className="text-sm">{c.title}</CardTitle>
        <CardDescription>{c.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer
          config={chartConfig}
          className="h-[210px] w-full"
        >
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 12, right: 12, bottom: 4, left: 0 }}
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
            <YAxis hide domain={[0, maxY]} />
            <ReferenceLine
              y={org.budget}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.45}
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
              dot={false}
              connectNulls={false}
            />
            <Line
              dataKey="projected"
              type="monotone"
              stroke="var(--color-projected)"
              strokeWidth={3}
              strokeDasharray="6 6"
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ChartContainer>

        <dl className="grid grid-cols-3 gap-3 border-t pt-4 text-xs">
          <div>
            <dt className="text-muted-foreground">{c.spent}</dt>
            <dd className="mt-1 font-medium tabular-nums">
              {money(org.spent, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{c.budget}</dt>
            <dd className="mt-1 font-medium tabular-nums">
              {money(org.budget, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{c.elapsed}</dt>
            <dd className="mt-1 font-medium tabular-nums">
              {percent(org.pctElapsed)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
