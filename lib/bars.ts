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

/** One tick tile: a rounded bar of `width` on a `step` period. `mask-size`
 *  stretches the tile to the bar's height, which stretches the corner radius
 *  with it — so `authoredHeight` should track the heights the variant is used
 *  at, or a tall bar ends up with pill-shaped caps. `fill='black'` is opaque,
 *  which is all an alpha mask reads. */
const tickMask = (
  width: number,
  step: number,
  authoredHeight: number,
): CSSProperties => {
  const h = authoredHeight;
  const svg = `%3Csvg xmlns='http://www.w3.org/2000/svg' width='${step}' height='${h}'%3E%3Crect width='${width}' height='${h}' rx='1.5' fill='black'/%3E%3C/svg%3E`;
  const image = `url("data:image/svg+xml,${svg}")`;
  const size = `${step}px 100%`;
  return {
    backgroundColor: "currentColor",
    maskImage: image,
    maskSize: size,
    maskRepeat: "repeat-x",
    // Inline styles are never autoprefixed; without this Safari < 15.4 drops
    // the mask and paints a solid bar instead of ticks.
    WebkitMaskImage: image,
    WebkitMaskSize: size,
    WebkitMaskRepeat: "repeat-x",
  };
};

/** Standard tick texture: 4.5px rounded tick on a 7px grid, in currentColor.
 *  Authored at 12px for the ~8–14px bars it paints. */
export const TICKS: CSSProperties = tickMask(4.5, 7, 12);

/** Bold variant for the hero "Gasto do mês" bar, which is also the tallest —
 *  a fat tick on a wide period, so it reads as chunky WITHOUT closing the gap
 *  (founder-directed: the period grew with the tick, holding the air at 4px).
 *  Authored at its own 32px so the caps stay 1.5px instead of stretching into
 *  pills. Its own period is safe because the alignment invariant is per-bar:
 *  PacingBar paints track, ghost and fill all with THIS variant, and no
 *  standard-grid bar is stacked under it. */
export const TICKS_BOLD: CSSProperties = tickMask(7.5, 11.5, 32);

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
