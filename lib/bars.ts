import type { CSSProperties } from "react";

// Pure geometry for the hand-rolled budget bars (frontend F3: a progress bar is
// not a chart). The budget is the 100% reference line. Spend can pass it (a
// breach) and the run-rate ghost can pass it further, so the track is scaled to
// the largest of the three and every part is positioned as a fraction of that
// scale — the budget marker included, so it slides left as the overrun grows.
//
// The tick texture and clip-path cut below are the shared painting primitives:
// every bar layer paints the SAME full-width tick grid (currentColor) and is
// cut by clip-path, so track/fill/ghost tick columns always align — a
// left-offset layer would start its own grid.
//
// The ticks are painted as a MASK over a currentColor fill, not as a repeating
// gradient (2026-08-01, founder-directed): a gradient stop cannot have rounded
// ends. A mask carries alpha only, so the color still comes from each layer's
// `color` exactly as before, and filters like `brightness-115` keep working.

/** One tick tile: a compact segment of `width` on a `step` period. The
 *  authored SVG is scaled to the rendered bar height by `mask-size`; the cap
 *  radius is explicit so compact bars can stay crisp while the hero variant
 *  can become a full vertical pill. `fill` is opaque, which is all an alpha
 *  mask reads. */
const tickMask = (
  width: number,
  step: number,
  authoredHeight: number,
  tickHeight = authoredHeight,
  capRadius = 1.5,
): CSSProperties => {
  const h = authoredHeight;
  const y = (h - tickHeight) / 2;
  const radius = Math.min(capRadius, width / 2, tickHeight / 2);
  const svg = `%3Csvg xmlns='http://www.w3.org/2000/svg' width='${step}' height='${h}'%3E%3Crect x='0' y='${y}' width='${width}' height='${tickHeight}' rx='${radius}' ry='${radius}' fill='black'/%3E%3C/svg%3E`;
  const tickImage = `url("data:image/svg+xml,${svg}")`;
  return {
    backgroundColor: "currentColor",
    // Keep one mask layer per tile. A separate edge strip makes the first
    // and last pills partly square, which is especially visible on the hero
    // bar at small widths.
    maskImage: tickImage,
    maskSize: `${step}px 100%`,
    maskRepeat: "repeat-x",
    // Inline styles are never autoprefixed; without this Safari < 15.4 drops
    // the mask and paints a solid bar instead of ticks.
    WebkitMaskImage: tickImage,
    WebkitMaskSize: `${step}px 100%`,
    WebkitMaskRepeat: "repeat-x",
  };
};

/** Standard compact texture: horizontal segments on a 13px grid. The 10px
 *  authored tick leaves a deliberate 3px seam, keeping short bars legible
 *  instead of letting neighboring segments melt together. */
export const TICKS: CSSProperties = tickMask(10, 13, 12, 10);

/** Bold variant for the hero "Gasto do mês" bar, which is also the tallest —
 *  a fat vertical pill on a wide period, so it reads as chunky WITHOUT
 *  closing the gap (the period grew with the tick, holding the air at 4px).
 *  Its own period is safe because the alignment invariant is per-bar:
 *  PacingBar paints track, ghost and fill all with THIS variant, and no
 *  standard-grid bar is stacked under it. */
// The hero's tall segments are full vertical pills: the top and base stay
// rounded at every fill percentage, including the leading clipped segment.
export const TICKS_BOLD: CSSProperties = tickMask(7.5, 11.5, 32, 32, 3.75);

/** clip-path inset cutting a full-width layer to the [from..to] fraction. */
export const cut = (from: number, to: number): string =>
  `inset(0 ${((1 - to) * 100).toFixed(2)}% 0 ${(from * 100).toFixed(2)}%)`;

export type BarGeometry = {
  /** Filled portion (spent), 0..1 of the track. */
  fill: number;
  /** Ghost start = fill; ghost end = projection, 0..1 of the track. null when
   *  there is no projection to extend (day-5 guard) or it doesn't exceed spend. */
  ghostStart: number | null;
  ghostEnd: number | null;
  /** Budget line position, 0..1 of the track (1 only when nothing exceeds budget). */
  marker: number;
};

/**
 * Positions the fill, the projection ghost and the budget marker on a single
 * track. `pctSpent`/`pctProjected` are fractions of budget (1 = exactly on
 * budget). The track scales to whichever is largest (min 1), so an overrun stays
 * visible instead of clipping at the edge.
 */
export function barGeometry(
  pctSpent: number,
  pctProjected: number | null,
): BarGeometry {
  const spent = Math.max(0, pctSpent);
  const projected = pctProjected !== null ? Math.max(0, pctProjected) : null;
  const scale = Math.max(1, spent, projected ?? 0);

  const fill = spent / scale;
  const marker = 1 / scale;

  // A ghost only reads when the projection lands beyond what's already spent.
  const hasGhost = projected !== null && projected > spent;
  return {
    fill,
    ghostStart: hasGhost ? fill : null,
    ghostEnd: hasGhost ? (projected as number) / scale : null,
    marker,
  };
}
