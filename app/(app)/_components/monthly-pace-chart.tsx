"use client";

import { useId } from "react";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyPace, MonthlyPaceRow } from "@/lib/engine/monthly-pace";
import { compactMoney, money } from "@/lib/money";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Label,
  Line,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { homeCopy } from "./copy";
import { InfoTip } from "./info-tip";

// Home's "Evolução do mês" (redesigned 2026-07-18): a composed cumulative +
// daily-bars chart, one point PER DAY of the period. The realized cumulative
// (solid brand line + soft area) sits in the top ~70% band; the daily spend
// bars in the bottom ~30% (a hidden second Y axis scaled so they never climb
// past the band). The projection is a dashed tail from today; the budget and
// the expected-pace diagonal are neutral references (semaphore is budget-status
// only, P5); the one place status-red appears is the soft overrun band above
// the budget on the projection, marking a genuine breach. Every number is
// engine-provided (buildMonthlyPace) — this component only draws.

const c = homeCopy.monthlyPace;

// Share of the plot the daily bars may fill (the ~30% bottom band). The hidden
// bar axis is scaled to maxDaily / BAND, so the tallest bar lands at the top of
// the band and the rest read relative to it.
const BAND = 0.3;

const chartConfig = {
  // chart-1, not the deep primary: the lighter brand orange reads cleaner as a
  // line and doesn't collide with the status red on adjacent cards.
  realized: { label: c.spent, color: "var(--brand-accent)" },
  projected: {
    label: c.projected,
    color: "color-mix(in oklab, var(--brand-accent) 55%, transparent)",
  },
  daily: {
    label: c.dailySpend,
    color: "color-mix(in oklab, var(--brand-accent) 45%, transparent)",
  },
} satisfies ChartConfig;

/** A compact header metric (label secondary, value in the foreground). */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}

// The full candidate set; Recharts thins it by `minTickGap` on narrow widths
// (preserveStartEnd keeps day 1 and the last day), so no manual measurement.
function xTicks(daysInPeriod: number): number[] {
  return [...[1, 5, 10, 15, 20, 25].filter((d) => d < daysInPeriod), daysInPeriod];
}

export function MonthlyPaceChart({
  pace,
  currency,
  monthLabel,
}: {
  pace: MonthlyPace;
  currency: string;
  /** pt-BR month name for the tooltip's day label ("14 de julho"). */
  monthLabel: string;
}) {
  // One chart instance, but the gradient id must still be unique per mount so a
  // second chart on the page can't resolve to this one's fill def.
  const fillId = useId().replace(/:/g, "");
  const { rows, todayDay, todayValue, paceToday, projection, budget, crossing } =
    pace;

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
  const maxDaily = rows.reduce((max, r) => Math.max(max, r.daily ?? 0), 0);
  const maxY =
    Math.max(budget, projection ?? 0, todayValue, 1) * 1.08;
  const ticks = xTicks(daysInPeriod);
  const tickLabel = (day: number) => String(day);

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

  return (
    <Card className="min-h-full">
      <CardHeader className="gap-3">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          {c.title}
          <InfoTip label={c.title}>{c.info}</InfoTip>
        </CardTitle>
        {/* Metrics row — no new cards, small aligned blocks. Wraps to two lines
            on narrow widths (mobile); never compresses. */}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Metric label={c.realizedLabel} value={money(todayValue, currency)} />
          <Metric
            label={c.paceTodayLabel}
            value={paceToday === null ? "—" : money(paceToday, currency)}
          />
          <Metric label={c.projectionLabel} value={projectionText} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        <div
          data-reveal="monthly-pace"
          suppressHydrationWarning
          className="flex flex-1 flex-col"
        >
          <div data-reveal-wipe className="min-h-0 flex-1">
            <p className="sr-only">{ariaLabel}</p>
            {/* debounce: stretch-while-frozen during continuous resizes
                (sidebar collapse) instead of per-frame re-renders. */}
            <ChartContainer
              config={chartConfig}
              debounce={80}
              className="h-full min-h-[220px] w-full overflow-hidden"
            >
              <ComposedChart
                accessibilityLayer
                data={rows}
                margin={{ top: 16, right: 16, bottom: 4, left: 8 }}
              >
                <defs>
                  {/* Soft orange fill under the realized line only — the
                      EvilCharts "gradient" variant: color at the top fading to
                      transparent. */}
                  <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-realized)" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="var(--color-realized)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <ChartLegend
                  verticalAlign="top"
                  align="right"
                  content={<ChartLegendContent className="justify-end pb-2 pt-0" />}
                />
                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[1, daysInPeriod]}
                  ticks={ticks}
                  tickFormatter={tickLabel}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  interval="preserveStartEnd"
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="cumulative"
                  domain={[0, maxY]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  width={72}
                  tickFormatter={(value: number) => compactMoney(value, currency)}
                />
                {/* Hidden bar axis: scaled so the tallest daily bar lands at the
                    top of the bottom BAND and never intrudes on the line. */}
                <YAxis
                  yAxisId="daily"
                  orientation="right"
                  hide
                  domain={[0, Math.max(maxDaily / BAND, 1)]}
                />
                {/* Expected pace: the budget spread evenly over the days — a
                    neutral, finely dotted diagonal so real spend visibly
                    detaches from plan. Never semaphore-colored. */}
                {budget > 0 && (
                  <ReferenceLine
                    yAxisId="cumulative"
                    segment={[
                      { x: 1, y: budget / daysInPeriod },
                      { x: daysInPeriod, y: budget },
                    ]}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="2 5"
                    strokeOpacity={0.5}
                    label={{
                      value: c.pace,
                      position: "center",
                      fill: "var(--muted-foreground)",
                      fontSize: 11,
                      dy: -8,
                    }}
                  />
                )}
                {budget > 0 && (
                  <ReferenceLine
                    yAxisId="cumulative"
                    y={budget}
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
                )}
                <ChartTooltip
                  cursor={{ strokeDasharray: "3 3", strokeOpacity: 0.6 }}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(_, payload) =>
                        c.dayLabel(
                          Number(payload?.[0]?.payload?.day ?? 0),
                          monthLabel,
                        )
                      }
                      formatter={(_value, _name, item) => (
                        <PaceTooltipRows
                          row={item.payload as MonthlyPaceRow}
                          currency={currency}
                        />
                      )}
                    />
                  }
                />
                {/* Daily spend bars (bottom band). Neutral-brand, low opacity —
                    secondary to the line; the hovered bar lifts via activeBar. */}
                <Bar
                  yAxisId="daily"
                  dataKey="daily"
                  fill="var(--color-daily)"
                  fillOpacity={0.55}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                  activeBar={{ fillOpacity: 0.9 }}
                />
                {/* Soft red overrun: only the region above the budget along the
                    projection. baseValue pins the fill floor to the budget. */}
                {budget > 0 && (
                  <Area
                    yAxisId="cumulative"
                    dataKey="overrun"
                    type="monotone"
                    baseValue={budget}
                    stroke="none"
                    fill="var(--status-red)"
                    fillOpacity={0.1}
                    connectNulls={false}
                    isAnimationActive={false}
                    tooltipType="none"
                    legendType="none"
                    activeDot={false}
                  />
                )}
                <Area
                  yAxisId="cumulative"
                  dataKey="realized"
                  type="monotone"
                  stroke="none"
                  fill={`url(#${fillId})`}
                  connectNulls={false}
                  isAnimationActive={false}
                  tooltipType="none"
                  legendType="none"
                  activeDot={false}
                />
                <Line
                  yAxisId="cumulative"
                  dataKey="realized"
                  type="monotone"
                  stroke="var(--color-realized)"
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Line
                  yAxisId="cumulative"
                  dataKey="projected"
                  type="monotone"
                  stroke="var(--color-projected)"
                  strokeWidth={2.25}
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                />
                {/* Today guide + marker. */}
                <ReferenceLine
                  yAxisId="cumulative"
                  x={todayDay}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="2 3"
                  strokeOpacity={0.5}
                />
                {crossing !== null && projection !== null && (
                  <ReferenceDot
                    yAxisId="cumulative"
                    x={crossing.day}
                    y={budget}
                    r={3.5}
                    fill="var(--status-red)"
                    stroke="var(--background)"
                    strokeWidth={1.5}
                    ifOverflow="extendDomain"
                  />
                )}
                <ReferenceDot
                  yAxisId="cumulative"
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
                    offset={12}
                    fill="var(--foreground)"
                    fontSize={12}
                    fontWeight={500}
                  />
                </ReferenceDot>
              </ComposedChart>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Tooltip body for one day: cumulative, daily, expected pace, delta, and the
 *  projection once the tail has begun. Orange marker for the main series. */
function PaceTooltipRows({
  row,
  currency,
}: {
  row: MonthlyPaceRow;
  currency: string;
}) {
  const value = row.realized ?? row.projected;
  if (value === null) return null;

  const paceDelta =
    row.pace === null || row.realized === null ? null : row.realized - row.pace;
  const deltaText =
    paceDelta === null
      ? null
      : Math.abs(paceDelta) < 0.005
        ? c.paceOnTrack
        : paceDelta > 0
          ? c.paceAhead(money(paceDelta, currency))
          : c.paceBehind(money(-paceDelta, currency));

  return (
    <div className="flex min-w-[12rem] flex-col gap-1">
      <Row
        label={row.realized === null ? c.projected : c.cumulative}
        value={money(value, currency)}
        marker
      />
      {row.daily !== null && (
        <Row label={c.dailySpend} value={money(row.daily, currency)} />
      )}
      {row.pace !== null && (
        <Row label={c.pace} value={money(row.pace, currency)} muted />
      )}
      {deltaText !== null && (
        <p className="text-xs text-muted-foreground">{deltaText}</p>
      )}
    </div>
  );
}

function Row({
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
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {marker && (
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: "var(--brand-accent)" }}
          />
        )}
        {label}
      </span>
      <span
        className={`text-sm tabular-nums ${muted ? "text-muted-foreground" : "font-medium text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}
