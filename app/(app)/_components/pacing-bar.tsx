import { barGeometry, cut, TICKS_BOLD } from "@/lib/bars";
import { percent } from "@/lib/format";
import { homeCopy } from "./copy";

// The pacing bar (frontend §3.4, de-noise 2026-07-17): ONE bar where the pair
// used to stack two. Geometry comes from barGeometry; the segmented tick
// texture from lib/bars.
//
// Three tones (2026-08-01, founder-directed): spent at full accent, the
// run-rate projection at the SAME hue weakened — matching what SpendTrendChart
// already does for its projected series, so bar and chart read as one language
// — and the remaining budget neutral. They are an accent ramp rather than three
// hues on purpose: docs §4 caps orange at a few anchors per area and reserves
// green/amber/red for budget status (principle #5). Red enters only on a
// REALIZED breach, and then the projection follows the fill: a red bar trailing
// an orange projection would read as two different claims.
//
// The budget rule is the bar's ONE reference mark. The elapsed-time position
// was drawn as a second rule and removed (2026-08-01, founder-directed): the
// comparison it served now lives in the meta row above, where `dia N de M` sits
// beside `% gasto` — the two figures side by side instead of a mark to decode.
// `pctElapsed` still feeds the accessible description, which states both.

const c = homeCopy.hero;

export function PacingBar({
  pctSpent,
  pctProjected,
  pctElapsed,
  dayOfPeriod,
  daysInPeriod,
}: {
  pctSpent: number;
  pctProjected: number | null;
  pctElapsed: number;
  dayOfPeriod: number;
  daysInPeriod: number;
}) {
  const g = barGeometry(pctSpent, pctProjected);
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

  // Literal class strings, never interpolated: Tailwind only emits what it can
  // scan in the source. The projection sits well below the fill (38%, not the
  // 55% first tried) because two tones of one hue separate by LIGHTNESS alone —
  // at 55% the two halves of the bar blended into one smear. The track drops
  // with it so the whole ramp stays legible end to end.
  const breached = pctSpent > 1;
  const fillTone = breached ? "text-status-red" : "text-brand-accent";
  const ghostTone = breached ? "text-status-red/38" : "text-brand-accent/38";
  const swatchTone = breached ? "bg-status-red" : "bg-brand-accent";
  const swatchGhostTone = breached ? "bg-status-red/38" : "bg-brand-accent/38";

  return (
    // data-reveal-state is stamped by the RevealController pre-hydration.
    <div data-reveal="pacing-bar" suppressHydrationWarning className="group/bar">
      <p className="sr-only">
        {c.pace.description(percent(pctSpent), percent(pctElapsed))}
      </p>

      <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground tabular-nums">
          {c.periodDay(dayOfPeriod, daysInPeriod, percent(pctElapsed))}
        </span>
        <span className="font-medium tabular-nums">{percent(pctSpent)}</span>
      </div>

      {/* Taller than the app's other bars (founder-directed): this is the
          hero's own bar and carries the month's headline. */}
      <div className="relative h-8 w-full">
        <div aria-hidden className="absolute inset-0 text-foreground/15" style={TICKS_BOLD} />
        {g.ghostStart !== null && g.ghostEnd !== null && (
          <div
            data-reveal-bar
            className={`absolute inset-0 ${ghostTone}`}
            style={{
              ...TICKS_BOLD,
              clipPath: cut(g.ghostStart, g.ghostEnd),
              animationDelay: "260ms",
            }}
          />
        )}
        <div
          data-reveal-bar
          className={`absolute inset-0 ${fillTone}`}
          style={{ ...TICKS_BOLD, clipPath: cut(0, g.fill), animationDelay: "80ms" }}
        />
        {g.marker < 1 && (
          <div
            aria-hidden
            className="absolute inset-y-0 w-0.5 bg-foreground/80"
            style={{ left: pct(g.marker) }}
          />
        )}
      </div>

      {/* Legend on hover (founder-directed). Absolute, so revealing it costs no
          reflow; the sr-only sentence above carries the same content for
          assistive tech, which must never depend on a pointer. */}
      <div className="relative mt-1.5 h-4">
        <div
          aria-hidden
          className="absolute inset-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground opacity-0 group-hover/bar:opacity-100 motion-safe:transition-opacity motion-safe:duration-[180ms]"
        >
          <LegendItem swatch={`${SWATCH} ${swatchTone}`} label={c.pace.spent} />
          <LegendItem
            swatch={`${SWATCH} ${swatchGhostTone}`}
            label={c.pace.projected}
          />
          {/* The rules are drawn AS rules — a swatch should look like the mark
              it stands for. The budget is the strong line, not the neutral
              track: labelling that grey "Orçamento" would name two different
              marks the same thing, when the grey is simply room not yet
              claimed by either of the two above. */}
          <LegendItem
            swatch="h-2.5 w-0.5 shrink-0 bg-foreground/80"
            label={c.pace.budget}
          />
        </div>
      </div>
    </div>
  );
}

/** Shared swatch geometry. Each caller passes the FULL class list rather than
 *  composing widths, so no two width utilities can collide. */
const SWATCH = "h-2.5 w-2 shrink-0 rounded-[1.5px]";

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={swatch} />
      {label}
    </span>
  );
}
