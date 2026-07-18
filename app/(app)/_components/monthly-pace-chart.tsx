"use client";

import {
  ActiveDot,
  Area,
  EvilAreaChart,
  Grid,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/evilcharts/charts/area-chart";
import { type ChartConfig } from "@/components/evilcharts/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetEvaluation } from "@/lib/engine/budget";
import { compactMoney, money } from "@/lib/money";
import { Label, ReferenceDot, ReferenceLine } from "recharts";
import { homeCopy } from "./copy";
import { InfoTip } from "./info-tip";

const c = homeCopy.monthlyPace;

const chartConfig = {
  spent: {
    label: c.spent,
    colors: { light: ["var(--chart-1)"], dark: ["var(--chart-1)"] },
  },
  projected: {
    label: c.projected,
    colors: { light: ["var(--chart-2)"], dark: ["var(--chart-2)"] },
  },
} satisfies ChartConfig;

type PacePoint = {
  marker: string;
  x: number;
  spent: number | null;
  projected: number | null;
};

function buildPaceData(org: BudgetEvaluation): PacePoint[] {
  return [
    { marker: c.start, x: 0, spent: 0, projected: null },
    {
      marker: c.today,
      x: org.pctElapsed,
      spent: org.spent,
      projected: org.projection === null ? null : org.spent,
    },
    {
      marker: c.close,
      x: 1,
      spent: null,
      projected: org.pctElapsed < 1 ? org.projection : null,
    },
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
  const hasProjection = org.projection !== null && org.pctElapsed < 1;
  const maxY = Math.max(org.budget, org.spent, org.projection ?? 0, 1) * 1.08;
  const ticks = [0, org.pctElapsed, 1].filter((value, index, values) =>
    values.indexOf(value) === index,
  );
  const tickLabel = (value: number) => {
    if (value === 0) return c.start;
    if (value === 1) return c.close;
    return c.today;
  };

  return (
    <Card className="min-h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          {c.title}
          <InfoTip label={c.title}>{c.info}</InfoTip>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        {org.spent <= 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{c.empty}</p>
        ) : (
          <div
            data-reveal="monthly-pace"
            suppressHydrationWarning
            className="flex flex-1 flex-col"
          >
            <div data-reveal-wipe className="min-h-0 flex-1">
              <EvilAreaChart
                data={data}
                config={chartConfig}
                className="h-full min-h-[220px] w-full overflow-hidden"
                curveType="monotone"
                animationType="none"
                chartProps={{
                  margin: { top: 16, right: 16, bottom: 4, left: 8 },
                }}
              >
                <Grid />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={[0, 1]}
                  ticks={ticks}
                  tickFormatter={tickLabel}
                />
                <YAxis
                  domain={[0, maxY]}
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
                <Tooltip
                  formatter={(value, name) => (
                    <div className="flex min-w-[10rem] items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {String(name) === "projected" ? c.projected : c.spent}
                      </span>
                      <span className="text-sm font-medium tabular-nums">
                        {money(Number(value), currency)}
                      </span>
                    </div>
                  )}
                />
                <Area
                  dataKey="spent"
                  variant="gradient"
                  strokeVariant="solid"
                  areaProps={{
                    dataKey: "spent",
                    strokeWidth: 3,
                    strokeLinecap: "round",
                  }}
                >
                  <ActiveDot variant="default" />
                </Area>
                {hasProjection ? (
                  <>
                    <ReferenceLine
                      x={org.pctElapsed}
                      stroke="var(--muted-foreground)"
                      strokeDasharray="2 3"
                      strokeOpacity={0.5}
                    />
                    <Area
                      dataKey="projected"
                      variant="solid"
                      strokeVariant="dashed"
                      areaProps={{
                        dataKey: "projected",
                        fillOpacity: 0,
                        strokeWidth: 3,
                        strokeLinecap: "round",
                      }}
                    >
                      <ActiveDot variant="default" />
                    </Area>
                    {org.projectedBreach && org.projection !== null ? (
                      <ReferenceDot x={1} y={org.projection} r={0} ifOverflow="extendDomain">
                        <Label
                          value={c.projectionOver(
                            compactMoney(org.projection - org.budget, currency),
                          )}
                          position="left"
                          offset={10}
                          fill="var(--muted-foreground)"
                          fontSize={12}
                        />
                      </ReferenceDot>
                    ) : null}
                  </>
                ) : null}
                <ReferenceDot
                  x={org.pctElapsed}
                  y={org.spent}
                  r={4}
                  fill="var(--foreground)"
                  stroke="var(--background)"
                  strokeWidth={2}
                >
                  <Label
                    value={c.todayValue(compactMoney(org.spent, currency))}
                    position="top"
                    offset={10}
                    fill="var(--foreground)"
                    fontSize={12}
                    fontWeight={500}
                  />
                </ReferenceDot>
              </EvilAreaChart>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
