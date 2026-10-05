import { cut, pacingSegments, TICKS_BOLD, type Span } from "@/lib/bars";
import { percent } from "@/lib/format";
import { homeCopy } from "./copy";

// The pacing bar (frontend §3.4, de-noise 2026-07-17): ONE bar where the pair
// used to stack two. The segmented tick texture comes from lib/bars.
//
// Colors side by side inside the bar (2026-10-05, founder-directed), in
// reading order: what was spent and what the current pace will still spend
// inside the budget (orange, strong then light), what goes above the budget
// (red, solid when already spent, lighter when still to come) and the budget
// left free (a quiet gray). The budget is the ruler, so the limit
// shows as the turn to red in every state, never as a line. pacingSegments
// makes the segments adjacent and exclusive, so they never overlap and always
// tile the track. The meta row above pairs `dia N de M` with the spent
// percentage, the two figures the bar exists to compare.

const c = homeCopy.hero;

export function PacingBar({
  pctSpent,
  pctProjected,
  dayOfPeriod,
  daysInPeriod,
}: {
  pctSpent: number;
  pctProjected: number | null;
  dayOfPeriod: number;
  daysInPeriod: number;
}) {
  const s = pacingSegments(pctSpent, pctProjected);

  // The legend's overrun swatch follows the strongest red on the bar: solid
  // once the budget is already gone, the lighter projected red before that.
  // Literal class strings, never interpolated: Tailwind only emits what it can
  // scan in the source.
  const overSwatch = s.overspent ? "bg-status-red" : "bg-pace-over";

  return (
    // data-reveal-state is stamped by the RevealController pre-hydration.
    <div data-reveal="pacing-bar" suppressHydrationWarning>
      <p className="sr-only">
        {c.pace.description(percent(pctSpent), dayOfPeriod, daysInPeriod)}
      </p>

      <div aria-hidden className="mb-1.5 flex items-baseline justify-between gap-3 text-xs tabular-nums">
        <span className="text-muted-foreground">
          {c.pace.periodDay(dayOfPeriod, daysInPeriod)}
        </span>
        <span className="font-medium text-foreground">{percent(pctSpent)}</span>
      </div>

      {/* Taller than the app's other bars (founder-directed): this is the
          hero's own bar and carries the month's headline. */}
      <div aria-hidden className="relative h-8 w-full">
        <div className="absolute inset-0 text-foreground/8" style={TICKS_BOLD} />
        {s.leftover && (
          <Segment span={s.leftover} tone="text-pace-leftover" delay="340ms" />
        )}
        {s.projectedOver && (
          <Segment span={s.projectedOver} tone="text-pace-over" delay="260ms" />
        )}
        {s.projected && (
          <Segment span={s.projected} tone="text-pace-projected" delay="160ms" />
        )}
        {s.overspent && (
          <Segment span={s.overspent} tone="text-status-red" delay="120ms" />
        )}
        <Segment span={s.spent} tone="text-pace-spent" delay="80ms" />
      </div>

      <p className="mt-2 text-xs text-muted-foreground md:hidden">
        {c.pace.legend}
      </p>
      <div
        aria-hidden
        className="mt-2 hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:flex"
      >
        <LegendItem swatch={`${SWATCH} bg-pace-spent`} label={c.pace.spent} />
        <LegendItem swatch={`${SWATCH} bg-pace-projected`} label={c.pace.projected} />
        <LegendItem swatch={`${SWATCH} ${overSwatch}`} label={c.pace.over} />
        <LegendItem swatch={`${SWATCH} bg-pace-leftover`} label={c.pace.leftover} />
      </div>
    </div>
  );
}

/** One colored stretch of the tick track: the shared full-width grid, cut to
 *  its span so tick columns align across segments. */
function Segment({ span, tone, delay }: { span: Span; tone: string; delay: string }) {
  return (
    <div
      data-reveal-bar
      className={`absolute inset-0 ${tone}`}
      style={{ ...TICKS_BOLD, clipPath: cut(span.from, span.to), animationDelay: delay }}
    />
  );
}

/** Shared swatch geometry. Each caller passes the FULL class list rather than
 *  composing widths, so no two width utilities can collide. */
const SWATCH = "h-2.5 w-2 shrink-0 rounded-xs";

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={swatch} />
      {label}
    </span>
  );
}
