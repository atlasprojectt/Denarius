"use client";

import { useId } from "react";

import {
  SpendAreaGradient,
  SpendChartGrid,
} from "@/components/domain/spend-chart-visuals";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyPace, MonthlyPaceRow } from "@/lib/engine/monthly-pace";
import { percent } from "@/lib/format";
import { compactMoney, money } from "@/lib/money";
import {
  Area,
  ComposedChart,
  Label,
  Line,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
  type CartesianViewBox,
  type LabelProps,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";
import { homeCopy } from "./copy";
import { InfoTip } from "./info-tip";

// The engine owns the point-per-day data and the day-5 projection guard. This
// component deliberately draws only the executive reading: realized spend,
// its projected tail, the monthly budget, and today.
const c = homeCopy.monthlyPace;

const chartConfig = {
  realized: { label: c.spent, color: "var(--brand-accent)" },
  projected: {
    label: c.projected,
    color: "color-mix(in oklab, var(--brand-accent) 58%, transparent)",
  },
} satisfies ChartConfig;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-28 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}

function xTicks(daysInPeriod: number): number[] {
  return [
    ...[1, 5, 10, 15, 20, 25].filter((day) => day < daysInPeriod),
    daysInPeriod,
  ];
}

function DayTick({
  x = 0,
  y = 0,
  payload,
  todayDay,
}: {
  x?: number;
  y?: number;
  payload?: { value?: number };
  todayDay: number;
}) {
  const day = Number(payload?.value ?? 0);
  const isToday = day === todayDay;

  return (
    <text
      x={x}
      y={y + 12}
      textAnchor="middle"
      fill={isToday ? "var(--foreground)" : "var(--muted-foreground)"}
      fontSize={12}
      fontWeight={isToday ? 600 : 400}
      className="tabular-nums"
    >
      {day}
    </text>
  );
}

function cartesianViewBox(viewBox: LabelProps["viewBox"]): CartesianViewBox {
  if (viewBox && "x" in viewBox) return viewBox;
  return {};
}

function EndLabel({
  viewBox,
  parentViewBox,
  value,
  tone,
}: LabelProps & { tone: "budget" | "projection" }) {
  const box = cartesianViewBox(viewBox);
  const parent = cartesianViewBox(parentViewBox);
  const x = box.x ?? 0;
  const y = box.y ?? 0;
  const width = box.width ?? 0;
  const height = box.height ?? 0;
  const text = String(value ?? "");
  const isProjection = tone === "projection";
  const anchorX = isProjection ? x + width / 2 - 8 : x + width - 6;
  const anchorY = isProjection ? y + height / 2 - 28 : y - 7;
  const labelWidth = Math.min(150, Math.max(92, text.length * 5.8 + 14));
  const plotLeft = parent.x ?? x;
  const rectX = Math.max(plotLeft + 4, anchorX - labelWidth);
  // On the first zero-width layout pass the plot clamp can land right of the
  // anchor; a negative width is invalid SVG and logs a console error.
  const rectWidth = Math.max(0, anchorX - rectX);

  return (
    <g aria-hidden pointerEvents="none">
      <rect
        x={rectX}
        y={anchorY - 12}
        width={rectWidth}
        height={17}
        rx={3}
        fill="var(--card)"
        fillOpacity={0.96}
      />
      <text
        x={anchorX - 6}
        y={anchorY}
        textAnchor="end"
        fill={isProjection ? "var(--foreground)" : "var(--muted-foreground)"}
        fontSize={11}
        fontWeight={isProjection ? 500 : 400}
        className="tabular-nums"
      >
        {text}
      </text>
    </g>
  );
}

export function MonthlyPaceChart({
  pace,
  currency,
  monthLabel,
}: {
  pace: MonthlyPace;
  currency: string;
  monthLabel: string;
}) {
  const fillId = useId().replace(/:/g, "");
  const {
    rows,
    todayDay,
    todayValue,
    paceToday,
    projection,
    budget,
    crossing,
    projectionBudgetDelta,
    projectionBudgetDeltaRatio,
  } = pace;

  if (todayValue <= 0) {
    return (
      <Card className="min-h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            {c.title}
            <InfoTip label={c.title}>{c.info}</InfoTip>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center">
          <p className="py-8 text-center text-sm text-muted-foreground">
            {c.empty}
          </p>
        </CardContent>
      </Card>
    );
  }

  const daysInPeriod = rows.length;
  const maxY = Math.max(budget, projection ?? 0, todayValue, 1) * 1.08;
  const projectionText =
    projection === null ? c.collectingShort : money(projection, currency);
  const ariaLabel =
    projection === null
      ? c.ariaCollecting(
          money(todayValue, currency),
          paceToday === null ? "—" : money(paceToday, currency),
        )
      : c.aria(
          money(todayValue, currency),
          paceToday === null ? "—" : money(paceToday, currency),
          money(projection, currency),
        );
  const projectionLabel =
    projection === null
      ? null
      : c.projectionValue(compactMoney(projection, currency, 2));

  return (
    <Card className="min-h-full">
      <CardHeader className="gap-2.5 pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          {c.title}
          <InfoTip label={c.title}>{c.info}</InfoTip>
        </CardTitle>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Metric label={c.realizedLabel} value={money(todayValue, currency)} />
          <Metric
            label={c.paceTodayLabel}
            value={paceToday === null ? "—" : money(paceToday, currency)}
          />
          <Metric label={c.projectionLabel} value={projectionText} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center pt-0">
        <div
          data-reveal="monthly-pace"
          suppressHydrationWarning
          className="flex min-h-[220px] flex-1 flex-col"
        >
          <p className="sr-only">{ariaLabel}</p>
          <div data-reveal-wipe className="min-h-0 flex-1">
            <ChartContainer
              config={chartConfig}
              debounce={80}
              className="h-full min-h-[220px] w-full overflow-hidden"
            >
              <ComposedChart
                accessibilityLayer
                data={rows}
                margin={{ top: 28, right: 28, bottom: 6, left: 4 }}
              >
                <SpendChartGrid />
                <SpendAreaGradient id={fillId} />
                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[1, daysInPeriod]}
                  ticks={xTicks(daysInPeriod)}
                  tick={<DayTick todayDay={todayDay} />}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)", strokeOpacity: 0.65 }}
                  tickMargin={8}
                  minTickGap={24}
                  interval="preserveStartEnd"
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

                {budget > 0 && (
                  <ReferenceLine
                    y={budget}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="7 5"
                    strokeOpacity={0.46}
                    strokeWidth={1}
                  >
                    <Label
                      value={c.budgetValue(compactMoney(budget, currency))}
                      content={(labelProps) => (
                        <EndLabel {...labelProps} tone="budget" />
                      )}
                    />
                  </ReferenceLine>
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
                  content={(tooltipProps) => (
                    <PaceTooltip
                      {...tooltipProps}
                      currency={currency}
                      monthLabel={monthLabel}
                      budget={budget}
                      daysInPeriod={daysInPeriod}
                      projectionBudgetDelta={projectionBudgetDelta}
                      projectionBudgetDeltaRatio={projectionBudgetDeltaRatio}
                      crossingDay={crossing?.displayDay ?? null}
                    />
                  )}
                />

                <Area
                  dataKey="realized"
                  type="monotone"
                  stroke="var(--color-realized)"
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

                <ReferenceLine
                  x={todayDay}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="2 4"
                  strokeOpacity={0.44}
                  strokeWidth={1}
                />
                <ReferenceDot
                  x={todayDay}
                  y={todayValue}
                  r={4}
                  fill="var(--background)"
                  stroke="var(--brand-accent)"
                  strokeWidth={2.5}
                >
                  <Label
                    value={c.todayValue(compactMoney(todayValue, currency))}
                    position="top"
                    offset={11}
                    fill="var(--foreground)"
                    fontSize={11}
                    fontWeight={600}
                  />
                </ReferenceDot>
                {crossing !== null && (
                  <ReferenceDot
                    x={crossing.day}
                    y={budget}
                    r={2.5}
                    fill="var(--brand-accent)"
                    fillOpacity={0.58}
                    stroke="var(--background)"
                    strokeWidth={1}
                    ifOverflow="extendDomain"
                  />
                )}
                {projection !== null && projectionLabel !== null && (
                  <ReferenceDot
                    x={daysInPeriod}
                    y={projection}
                    r={4.5}
                    fill="var(--brand-accent)"
                    stroke="var(--background)"
                    strokeWidth={1.5}
                    ifOverflow="visible"
                  >
                    <Label
                      value={projectionLabel}
                      content={(labelProps) => (
                        <EndLabel {...labelProps} tone="projection" />
                      )}
                    />
                  </ReferenceDot>
                )}
              </ComposedChart>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PaceTooltip({
  active,
  payload,
  currency,
  monthLabel,
  budget,
  daysInPeriod,
  projectionBudgetDelta,
  projectionBudgetDeltaRatio,
  crossingDay,
}: TooltipContentProps<TooltipValueType, string | number> & {
  currency: string;
  monthLabel: string;
  budget: number;
  daysInPeriod: number;
  projectionBudgetDelta: number | null;
  projectionBudgetDeltaRatio: number | null;
  crossingDay: number | null;
}) {
  if (!active || !payload.length) return null;

  const row = payload[0]?.payload as MonthlyPaceRow | undefined;
  if (!row) return null;

  const isClose = row.day === daysInPeriod && row.projected !== null;

  return (
    <div className="min-w-56 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-50 shadow-lg">
      <p className="mb-2 font-medium">{c.dayLabel(row.day, monthLabel)}</p>
      <div className="grid grid-cols-[1fr_auto] gap-x-5 gap-y-1.5">
        {row.realized !== null && (
          <TooltipRow
            label={c.cumulative}
            value={money(row.realized, currency)}
            marker
          />
        )}
        {row.projected !== null && row.realized === null && (
          <TooltipRow label={c.projected} value={money(row.projected, currency)} />
        )}
        {budget > 0 && (
          <TooltipRow label={c.budget} value={money(budget, currency)} muted />
        )}
        {isClose &&
          projectionBudgetDelta !== null &&
          projectionBudgetDeltaRatio !== null && (
          <TooltipRow
            label={c.versusBudget}
            value={
              projectionBudgetDelta >= 0
                ? c.aboveBudget(
                    money(projectionBudgetDelta, currency),
                    percent(projectionBudgetDeltaRatio, 1),
                  )
                : c.belowBudget(
                    money(projectionBudgetDelta, currency),
                    percent(projectionBudgetDeltaRatio, 1),
                  )
            }
            muted
          />
        )}
        {isClose && (
          <TooltipRow
            label={c.closingDate}
            value={c.dayLabel(daysInPeriod, monthLabel)}
            muted
          />
        )}
        {isClose && crossingDay !== null && (
          <TooltipRow
            label={c.estimatedBreach}
            value={c.dayLabel(crossingDay, monthLabel)}
            muted
          />
        )}
      </div>
    </div>
  );
}

function TooltipRow({
  label,
  value,
  marker = false,
  muted = false,
}: {
  label: string;
  value: string;
  marker?: boolean;
  muted?: boolean;
}) {
  return (
    <>
      <span className="flex items-center gap-1.5 text-zinc-400">
        {marker && (
          <span aria-hidden className="size-2 rounded-full bg-brand-accent" />
        )}
        {label}
      </span>
      <span
        className={`text-right tabular-nums ${muted ? "text-zinc-300" : "font-medium text-zinc-50"}`}
      >
        {value}
      </span>
    </>
  );
}
