"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Area,
  ComposedChart,
  Line,
  useActiveTooltipCoordinate,
  useActiveTooltipLabel,
  useIsTooltipActive,
  usePlotArea,
  useYAxisScale,
  XAxis,
  YAxis,
  ZIndexLayer,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";

import {
  SpendAreaGradient,
  SpendChartGrid,
} from "@/components/domain/spend-chart-visuals";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

// The app's one interactive spend-over-time chart (2026-08-01, founder-directed
// from a reference recording), shared by Home's "Evolução do mês" and the team
// drill-down's cumulative view. It owns the chart GRAMMAR (grid, area gradient,
// axes, margins) and the HOVER FOCUS — a hairline at the hovered day plus a
// date pill that glides along the x axis, covering the static tick beneath it.
// Everything above the plot (title, metrics, empty state) and the tooltip's
// content stay with the screens: this component draws, it never phrases (F2)
// and it never computes (invariant #2) — callers pass engine-built rows.
//
// The focus layer is DOM, not SVG, so the pill gets real typography and the
// design system's tokens. Recharts' hooks only work inside the chart, so a
// null-rendering bridge reads them there and writes transforms straight to the
// two overlay nodes — the hovered day never becomes React state, so moving the
// cursor re-renders neither the plot nor the screen around it.

/** Length of each tapered tip on the hover hairline. */
const HAIRLINE_TIP = 14;
/** Plot's top margin. */
const PLOT_TOP = 28;

/** Width of the lit stretch around the cursor, measured on the day axis. */
const HIGHLIGHT_DAY_SPAN = 2;
/** Softening at each end of that stretch — short, so the edge stays legible. */
const HIGHLIGHT_MAX_FEATHER = 4;

/** A dashed companion series (projection, expected pace). */
export type TrendLine = {
  key: string;
  /** SVG stroke-dasharray; omit for a solid line. */
  dash?: string;
  width?: number;
  opacity?: number;
};

type TooltipRenderProps = TooltipContentProps<TooltipValueType, string | number>;

function DayTick({
  x = 0,
  y = 0,
  payload,
  todayDay,
}: {
  x?: number;
  y?: number;
  payload?: { value?: number };
  todayDay: number | null;
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

/** Moves a focus node, suppressing the glide when it is (re)appearing — a
 *  transition from the node's stale position would read as a slide-in. */
function place(
  element: HTMLElement | SVGGraphicsElement,
  transform: string,
  instant: boolean,
) {
  if (!instant) {
    element.style.transform = transform;
    return;
  }
  const previous = element.style.transitionProperty;
  element.style.transitionProperty = "none";
  element.style.transform = transform;
  // Forced reflow (works on SVG too, unlike offsetWidth): commits the jump
  // before the transition is restored.
  void element.getBoundingClientRect();
  element.style.transitionProperty = previous;
}

/** Recharts sorts children into zIndex layers (SVG has no z-index), so plain
 *  DOM order does not decide what sits on top. 700 puts the veil above the
 *  grid (-100), the area (100), the lines (400) and the reference dots (600),
 *  but below the tooltip layers (1000+). The axis needs no ordering: the veil
 *  is geometrically confined to the plot box. */
const SCRIM_Z_INDEX = 700;

/** The lit copy of the series, one step above the veil that dimmed them. */
const HIGHLIGHT_Z_INDEX = 800;

/**
 * Layer for annotations passed in as `children` — reference dots and their
 * labels. Above the veil (700) and the lit copy (800), below the tooltip
 * (1000+). Callers MUST pass this to every `ReferenceDot`: Recharts puts them
 * at 600 by default, under the veil, and a label rendered through a custom
 * `content` stays in the dot's layer instead of reaching `Label`'s own 2000 —
 * so the projected-close figure was being dimmed by the very veil that exists
 * to make the hovered stretch legible. These are the honesty stamps (product
 * principle #3); the focus must never obscure them.
 */
export const CHART_ANNOTATION_Z_INDEX = 900;

/** Overdraw around the plot box so edge-anchored marks are veiled whole. */
const SCRIM_BLEED = 10;

/** Quiets the whole plot while hovering: a page-colored veil over everything
 *  behind it — grid, area fill, every series — dimmed EVENLY. It carries no
 *  window of its own; the lit stretch is `HighlightLayer` redrawing the line
 *  on top. Veiling uniformly is the point: a veil with a soft hole in it makes
 *  the line ramp from dim to bright, which reads as a gradient rather than as
 *  a highlighted line (2026-08-01, founder-directed). */
function FocusScrim() {
  const isActive = useIsTooltipActive();
  const coordinate = useActiveTooltipCoordinate();
  const plotArea = usePlotArea();

  const x = coordinate?.x;
  const visible =
    isActive &&
    plotArea !== undefined &&
    typeof x === "number" &&
    Number.isFinite(x);

  if (!plotArea || plotArea.width <= 0) return null;

  const { x: px, y: py, width: pw, height: ph } = plotArea;

  return (
    <ZIndexLayer zIndex={SCRIM_Z_INDEX}>
      {/* Bleeds past the plot box: marks anchored on an edge (the projected
          close dot) overhang it, and a rect stopping at the boundary would
          veil half of such a dot and leave the other half lit. */}
      <rect
        className="denarius-chart-scrim"
        data-visible={String(visible)}
        opacity={visible ? 0.62 : 0}
        pointerEvents="none"
        aria-hidden
        x={px - SCRIM_BLEED}
        y={py - SCRIM_BLEED}
        width={pw + SCRIM_BLEED * 2}
        height={ph + SCRIM_BLEED}
        fill="var(--chart-surface, var(--background))"
      />
    </ZIndexLayer>
  );
}

/** The highlight: a full-strength copy of every series, clipped to a window
 *  that glides with the cursor and drawn OVER the veil. This is what makes the
 *  lit stretch an object with an edge instead of a soft patch of "less dim".
 *
 *  Two details carry it. The window is a FIXED-shape mask that is translated
 *  rather than a gradient whose stops are recomputed per day — `transform` is
 *  CSS-animatable, so it glides on the same clock as the hairline. And the
 *  copies are stroke-only (`fill="none"`): clipping the area's gradient fill
 *  would put a bright rectangle inside the dimmed plot.
 *
 *  `zIndex={0}` on the copies is load-bearing. Recharts portals every series
 *  into its own zIndex layer (Area 100, Line 400), which would yank them out
 *  of the masked group; 0 means "render in place, no portal". */
function HighlightLayer({
  areaKey,
  lines,
  windowRef,
  xDomain,
}: {
  areaKey: string;
  lines: TrendLine[];
  windowRef: RefObject<SVGGElement | null>;
  xDomain: [number, number];
}) {
  const plotArea = usePlotArea();
  const rawId = useId().replace(/:/g, "");

  if (!plotArea || plotArea.width <= 0) return null;

  const boxY = plotArea.y - SCRIM_BLEED;
  const boxH = plotArea.height + SCRIM_BLEED;
  const domainSpan = Math.max(xDomain[1] - xDomain[0], 1);
  const highlightWidth = (plotArea.width / domainSpan) * HIGHLIGHT_DAY_SPAN;
  const highlightHalf = highlightWidth / 2;
  const highlightFeather = Math.min(
    HIGHLIGHT_MAX_FEATHER,
    highlightWidth * 0.12,
  );
  const highlightStop = highlightFeather / highlightWidth;
  const maskId = `highlight-${rawId}`;
  const gradientId = `highlight-grad-${rawId}`;

  return (
    <ZIndexLayer zIndex={HIGHLIGHT_Z_INDEX}>
      <defs>
        {/* White shows the copy through; the short black margins keep the
            window's edges from being a razor cut. */}
        <linearGradient id={gradientId}>
          <stop offset={0} stopColor="#000" />
          <stop offset={highlightStop} stopColor="#fff" />
          <stop offset={1 - highlightStop} stopColor="#fff" />
          <stop offset={1} stopColor="#000" />
        </linearGradient>
        <mask id={maskId}>
          <g ref={windowRef} className="denarius-chart-window">
            <rect
              x={-highlightHalf}
              y={boxY}
              width={highlightWidth}
              height={boxH}
              fill={`url(#${gradientId})`}
            />
          </g>
        </mask>
      </defs>
      <g mask={`url(#${maskId})`} pointerEvents="none" aria-hidden>
        <Area
          zIndex={0}
          dataKey={areaKey}
          type="monotone"
          stroke={`var(--color-${areaKey})`}
          strokeWidth={2.25}
          strokeLinecap="round"
          fill="none"
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
          activeDot={false}
        />
        {lines.map((line) => (
          <Line
            key={line.key}
            zIndex={0}
            dataKey={line.key}
            type="monotone"
            stroke={`var(--color-${line.key})`}
            strokeWidth={line.width ?? 1.8}
            strokeDasharray={line.dash}
            strokeLinecap="round"
            strokeOpacity={line.opacity}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
            activeDot={false}
          />
        ))}
      </g>
    </ZIndexLayer>
  );
}

/** Renders nothing; exists to read the chart's hover state from inside the
 *  Recharts context and drive the overlay nodes imperatively.
 *
 *  It also places the focus dot, which Recharts would otherwise own. Its own
 *  `activeDot` cannot glide — Chrome does not transition `cx`/`cy` written as
 *  SVG presentation attributes — and a dot that teleports while the hairline
 *  and the lit window slide breaks the illusion of one continuous line. So the
 *  dot becomes a DOM node like the rest of the focus, and the series value is
 *  resolved here: the first series with a value at the hovered day (the area
 *  wins ties, e.g. the shared vertex at "today"), mapped through the chart's
 *  own y scale. Null days resolve to nothing and the dot hides. */
function HoverFocus({
  hairlineRef,
  pillRef,
  dotRef,
  windowRef,
  pillLabel,
  rows,
  xKey,
  seriesKeys,
  seriesColor,
}: {
  hairlineRef: RefObject<HTMLDivElement | null>;
  pillRef: RefObject<HTMLDivElement | null>;
  dotRef: RefObject<HTMLDivElement | null>;
  /** The masked window that reveals the lit copy of the series. */
  windowRef: RefObject<SVGGElement | null>;
  pillLabel: (value: number) => string;
  rows: readonly object[];
  xKey: string;
  /** Series to probe for the dot, in priority order. */
  seriesKeys: string[];
  /** Series key → CSS color. The `--color-<key>` variables ChartStyle emits
   *  are scoped to the ChartContainer, and the dot lives outside it. */
  seriesColor: Record<string, string>;
}) {
  const isActive = useIsTooltipActive();
  const coordinate = useActiveTooltipCoordinate();
  const label = useActiveTooltipLabel();
  const plotArea = usePlotArea();
  const yScale = useYAxisScale();
  const wasVisible = useRef(false);

  useEffect(() => {
    const hairline = hairlineRef.current;
    const pill = pillRef.current;
    const dot = dotRef.current;
    const lit = windowRef.current;
    if (!hairline || !pill || !dot) return;

    const x = coordinate?.x;
    const visible =
      isActive &&
      plotArea !== undefined &&
      typeof x === "number" &&
      Number.isFinite(x);

    hairline.dataset.visible = String(visible);
    pill.dataset.visible = String(visible);

    if (!visible) {
      dot.dataset.visible = "false";
      wasVisible.current = false;
      return;
    }

    const instant = !wasVisible.current;
    wasVisible.current = true;

    hairline.style.top = `${plotArea.y}px`;
    hairline.style.height = `${plotArea.height}px`;
    // -1px centers the 2px hairline (and its tips) on the data point.
    place(hairline, `translateX(calc(${x}px - 1px))`, instant);
    if (lit) place(lit, `translateX(${x}px)`, instant);

    // Sits just under the axis line, tall enough to hide the tick label it
    // stands in for — the reference's "the pill replaces the date" effect.
    pill.style.top = `${plotArea.y + plotArea.height + 3}px`;
    pill.textContent =
      typeof label === "number" ? pillLabel(label) : (label ?? "");
    place(pill, `translateX(calc(${x}px - 50%))`, instant);

    const point = resolveFocusPoint(rows, xKey, seriesKeys, label, yScale);
    dot.dataset.visible = String(point !== null);
    if (point !== null) {
      dot.style.setProperty(
        "--focus-dot-color",
        seriesColor[point.key] ?? "var(--brand-accent)",
      );
      place(
        dot,
        `translate(calc(${x}px - 50%), calc(${point.y}px - 50%))`,
        instant,
      );
    }
  }, [
    isActive,
    coordinate,
    label,
    plotArea,
    yScale,
    pillLabel,
    rows,
    xKey,
    seriesKeys,
    seriesColor,
    hairlineRef,
    pillRef,
    dotRef,
    windowRef,
  ]);

  return null;
}

/** Which series the focus dot should sit on at the hovered x, and where. */
function resolveFocusPoint(
  rows: readonly object[],
  xKey: string,
  seriesKeys: string[],
  label: string | number | undefined,
  yScale: ((value: unknown) => number | undefined) | undefined,
): { key: string; y: number } | null {
  if (yScale === undefined || label === undefined) return null;

  const row = rows.find(
    (candidate) => (candidate as Record<string, unknown>)[xKey] === label,
  ) as Record<string, unknown> | undefined;
  if (row === undefined) return null;

  for (const key of seriesKeys) {
    const value = row[key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const y = yScale(value);
    return typeof y === "number" && Number.isFinite(y) ? { key, y } : null;
  }
  return null;
}

export function SpendTrendChart<Row extends object>({
  rows,
  xKey,
  xDomain,
  xTicks,
  todayDay = null,
  yMax,
  yTickFormatter,
  config,
  areaKey,
  lines = [],
  pillLabel,
  renderTooltip,
  className,
  children,
  ...rest
}: {
  rows: Row[];
  /** Row field carrying the x value (the day of the period). */
  xKey: string;
  xDomain: [number, number];
  xTicks: number[];
  /** Bolds this x tick; null when the series has no "today". */
  todayDay?: number | null;
  yMax: number;
  yTickFormatter: (value: number) => string;
  config: ChartConfig;
  /** Row field drawn as the gradient area (the realized spend). */
  areaKey: string;
  lines?: TrendLine[];
  /** Text for the axis pill, e.g. `(day) => "8 de julho"`. */
  pillLabel: (value: number) => string;
  renderTooltip: (props: TooltipRenderProps) => ReactNode;
  /** Sizes the plot: Home passes `min-h-0 flex-1`, the drill-down `h-[280px]`. */
  className?: string;
  /** Recharts extras drawn on top of the series (reference dots, labels). */
  children?: ReactNode;
} & Omit<React.ComponentProps<"div">, "children" | "className">) {
  const fillId = useId().replace(/:/g, "");
  const hairlineRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<SVGGElement>(null);
  // The area wins ties (at "today" the realized and projected series share a
  // vertex) — the dot belongs on what actually happened.
  const seriesKeys = useMemo(
    () => [areaKey, ...lines.map((line) => line.key)],
    [areaKey, lines],
  );
  const seriesColor = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [key, item] of Object.entries(config)) {
      if (item.color !== undefined) map[key] = item.color;
    }
    return map;
  }, [config]);

  return (
    <div className={cn("relative", className)} {...rest}>
      <ChartContainer
        config={config}
        debounce={80}
        className="absolute inset-0 h-full w-full cursor-crosshair overflow-hidden"
      >
        <ComposedChart
          accessibilityLayer
          data={rows}
          margin={{ top: PLOT_TOP, right: 28, bottom: 6, left: 4 }}
        >
          <SpendChartGrid />
          <SpendAreaGradient id={fillId} />

          <XAxis
            dataKey={xKey}
            type="number"
            domain={xDomain}
            ticks={xTicks}
            tick={<DayTick todayDay={todayDay} />}
            tickLine={false}
            axisLine={{ stroke: "var(--border)", strokeOpacity: 0.65 }}
            tickMargin={8}
            minTickGap={24}
            interval="preserveStartEnd"
            allowDecimals={false}
          />
          <YAxis
            domain={[0, yMax]}
            tickCount={5}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            width={68}
            tickFormatter={yTickFormatter}
          />

          {/* The tooltip stays free on both axes. Its short transition is
              independent from the slower, decelerating highlight window. */}
          <ChartTooltip
            cursor={false}
            isAnimationActive="auto"
            animationDuration={120}
            animationEasing="ease-out"
            content={(tooltipProps) => renderTooltip(tooltipProps)}
          />

          <Area
            dataKey={areaKey}
            type="monotone"
            stroke={`var(--color-${areaKey})`}
            strokeWidth={2.25}
            strokeLinecap="round"
            fill={`url(#${fillId})`}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
            // The focus dot is a DOM node driven by HoverFocus, so it can
            // glide between days; Recharts' own would teleport.
            activeDot={false}
          />

          {lines.map((line) => (
            <Line
              key={line.key}
              dataKey={line.key}
              type="monotone"
              stroke={`var(--color-${line.key})`}
              strokeWidth={line.width ?? 1.8}
              strokeDasharray={line.dash}
              strokeLinecap="round"
              strokeOpacity={line.opacity}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={false}
            />
          ))}

          {children}

          <FocusScrim />
          <HighlightLayer
            areaKey={areaKey}
            lines={lines}
            windowRef={windowRef}
            xDomain={xDomain}
          />

          <HoverFocus
            hairlineRef={hairlineRef}
            pillRef={pillRef}
            dotRef={dotRef}
            windowRef={windowRef}
            pillLabel={pillLabel}
            rows={rows}
            xKey={xKey}
            seriesKeys={seriesKeys}
            seriesColor={seriesColor}
          />
        </ComposedChart>
      </ChartContainer>

      {/* Pointed at BOTH ends (reference recording): the hairline reads as an
          indicator spanning the plot rather than a rule crossing it. */}
      <div
        ref={hairlineRef}
        aria-hidden
        data-visible="false"
        style={{
          clipPath: `polygon(50% 0, 100% ${HAIRLINE_TIP}px, 100% calc(100% - ${HAIRLINE_TIP}px), 50% 100%, 0 calc(100% - ${HAIRLINE_TIP}px), 0 ${HAIRLINE_TIP}px)`,
        }}
        className="denarius-chart-focus pointer-events-none absolute left-0 w-[2px] bg-[color-mix(in_oklab,var(--brand-accent)_82%,transparent)]"
      />
      <div
        ref={pillRef}
        aria-hidden
        data-visible="false"
        className="denarius-chart-focus pointer-events-none absolute left-0 rounded-pill bg-muted px-3 py-1 text-xs font-medium text-foreground tabular-nums ring-1 ring-foreground/10"
      />
      {/* Colored by whichever series it landed on, so a projected day is never
          painted as if it had already happened. */}
      <div
        ref={dotRef}
        aria-hidden
        data-visible="false"
        className="denarius-chart-focus pointer-events-none absolute top-0 left-0 size-[9px] rounded-full bg-(--focus-dot-color)"
      />
    </div>
  );
}
