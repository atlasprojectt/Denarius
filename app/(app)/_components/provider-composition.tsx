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
import type { CompositionEntry } from "@/lib/engine/cockpit";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { Cell, Pie, PieChart } from "recharts";
import { homeCopy } from "./copy";

// "Para onde vai o dinheiro" (frontend §3.8): provider/seat composition as a
// shadcn/Recharts donut. Neutral chart tokens — this is composition, not budget
// status, so no semaphore colors (product principle #5).

const c = homeCopy.composition;

const chartConfig = {
  amount: { label: c.amount },
  openai: { label: "OpenAI", color: "var(--chart-1)" },
  anthropic: { label: "Anthropic", color: "var(--chart-2)" },
  seats: { label: "Assentos", color: "var(--chart-3)" },
  other: { label: "Outros", color: "var(--chart-4)" },
} satisfies ChartConfig;

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ProviderComposition({
  entries,
  currency,
}: {
  entries: CompositionEntry[];
  currency: string;
}) {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const chartData = entries.map((entry, index) => ({
    ...entry,
    fill: chartColors[index % chartColors.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{c.title}</CardTitle>
        <CardDescription>{c.drillNote}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.empty}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[190px_minmax(0,1fr)]">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square h-[190px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="label"
                      formatter={(value, name) => (
                        <div className="flex min-w-[10rem] items-center justify-between gap-4">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-mono font-medium tabular-nums">
                            {money(Number(value), currency)}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={chartData}
                  dataKey="amount"
                  nameKey="label"
                  innerRadius={54}
                  outerRadius={82}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="flex min-w-0 flex-col justify-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{c.total}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {money(total, currency)}
                </p>
              </div>

              <ul className="flex flex-col gap-3">
                {entries.map((entry, index) => (
                  <li key={entry.key} className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 size-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          chartColors[index % chartColors.length],
                      }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{entry.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {percent(entry.share)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {money(entry.amount, currency)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
