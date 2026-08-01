"use client";

import {
  CHART_ANNOTATION_Z_INDEX,
  SpendTrendChart,
} from "@/components/domain/spend-trend-chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { MonthlyPace, MonthlyPaceRow } from "@/lib/engine/monthly-pace";
import { percent } from "@/lib/format";
import { compactMoney, money } from "@/lib/money";
import {
  Label,
  ReferenceDot,
  type CartesianViewBox,
  type LabelProps,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";
import { homeCopy } from "./copy";
import { InfoTip } from "./info-tip";

// The engine owns the point-per-day data and the day-5 projection guard. This
// component deliberately draws only the executive reading: realized spend, its
// projected tail, and today's point (budget context lives in the tooltip —
// the reference lines were removed 2026-07-20, founder-directed). It carries no
// card chrome (2026-07-30, founder-directed): the plot sits directly on the page
// surface, so only the grid lines and the area itself frame it. The plot, its
// axes and the hover focus come from the shared SpendTrendChart.
const c = homeCopy.monthlyPace;

const chartConfig = {
  realized: { label: c.spent, color: "var(--brand-accent)" },
  projected: {
    label: c.projected,
    color: "color-mix(in oklab, var(--brand-accent) 58%, transparent)",
  },
} satisfies ChartConfig;

const trendLines = [{ key: "projected", dash: "6 6", width: 1.8 }];

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

function cartesianViewBox(viewBox: LabelProps["viewBox"]): CartesianViewBox {
  if (viewBox && "x" in viewBox) return viewBox;
  return {};
}

function EndLabel({ viewBox, parentViewBox, value }: LabelProps) {
  const box = cartesianViewBox(viewBox);
  const parent = cartesianViewBox(parentViewBox);
  const x = box.x ?? 0;
  const y = box.y ?? 0;
  const width = box.width ?? 0;
  const height = box.height ?? 0;
  const text = String(value ?? "");
  const anchorX = x + width / 2 - 8;
  const anchorY = y + height / 2 - 28;
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
        fill="var(--background)"
        fillOpacity={0.96}
      />
      <text
        x={anchorX - 6}
        y={anchorY}
        textAnchor="end"
        fill="var(--foreground)"
        fontSize={11}
        fontWeight={500}
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
      <section className="flex min-h-full flex-col gap-4 py-4">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-medium">
          {c.title}
          <InfoTip label={c.title}>{c.info}</InfoTip>
        </h2>
        <div className="flex flex-1 items-center justify-center">
          <p className="py-8 text-center text-sm text-muted-foreground">
            {c.empty}
          </p>
        </div>
      </section>
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
    <section className="flex min-h-full flex-col gap-2.5 py-4">
      <h2 className="flex items-center gap-1.5 font-heading text-sm font-medium">
        {c.title}
        <InfoTip label={c.title}>{c.info}</InfoTip>
      </h2>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Metric label={c.realizedLabel} value={money(todayValue, currency)} />
        <Metric
          label={c.paceTodayLabel}
          value={paceToday === null ? "—" : money(paceToday, currency)}
        />
        <Metric label={c.projectionLabel} value={projectionText} />
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <div
          data-reveal="monthly-pace"
          suppressHydrationWarning
          className="flex min-h-[220px] flex-1 flex-col"
        >
          <p className="sr-only">{ariaLabel}</p>
          <SpendTrendChart
            data-reveal-wipe
            className="min-h-0 flex-1"
            rows={rows}
            xKey="day"
            xDomain={[1, daysInPeriod]}
            xTicks={xTicks(daysInPeriod)}
            todayDay={todayDay}
            yMax={maxY}
            yTickFormatter={(value) => compactMoney(value, currency)}
            config={chartConfig}
            areaKey="realized"
            lines={trendLines}
            pillLabel={(day) => c.dayLabel(day, monthLabel)}
            renderTooltip={(tooltipProps) => (
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
          >
            <ReferenceDot
              zIndex={CHART_ANNOTATION_Z_INDEX}
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
                zIndex={CHART_ANNOTATION_Z_INDEX}
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
                zIndex={CHART_ANNOTATION_Z_INDEX}
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
                  content={(labelProps) => <EndLabel {...labelProps} />}
                />
              </ReferenceDot>
            )}
          </SpendTrendChart>
        </div>
      </div>
    </section>
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

  // The date stands OUTSIDE the panel (reference recording): it reads as a
  // caption over the plot, leaving the dark card to hold only the figures.
  return (
    <div className="min-w-56">
      <p className="mb-1.5 pl-0.5 text-xs font-medium text-foreground">
        {c.dayLabel(row.day, monthLabel)}
      </p>
      <div className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-50 shadow-lg">
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
