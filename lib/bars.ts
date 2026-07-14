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

/** Standard tick texture: 2px stroke on a 6px grid, painted in currentColor. */
export const TICKS: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 6px)",
};

/** Bold variant for the hero spend bar: 3px stroke on the SAME 6px period, so
 *  its tick columns stay aligned with the standard grid stacked below it. */
export const TICKS_BOLD: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 6px)",
};

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
