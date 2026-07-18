import { barGeometry, cut, TICKS_BOLD } from "@/lib/bars";
import { percent } from "@/lib/format";
import { homeCopy } from "./copy";

// The pacing bar (frontend §3.4, de-noise 2026-07-17): ONE bar where the pair
// used to stack two. The spend fill keeps the fixed brand accent until a real
// budget breach, when it switches to the semantic red,
// the ghost extension is the projection, the vertical line is the budget — and
// the month's elapsed time became a "hoje" tick UNDER the same scale, so the
// eye still compares "spent 58%" against "55% of the month gone" without a
// second bar. Segmented tick texture, geometry from barGeometry (unchanged).

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
  // Any value's x on the shared scale: value ÷ scale = value × marker (marker = 1/scale).
  const at = (v: number) => v * g.marker;

  const fill = pctSpent > 1 ? "text-status-red" : "text-brand-accent";

  // The "hoje" label hugs its tick mid-bar but pins to the edge near either
  // end, so it never overflows the card at day 1 or day 31.
  const todayX = at(pctElapsed);
  const todayLabelStyle =
    todayX < 0.15
      ? { left: 0 }
      : todayX > 0.85
        ? { right: 0 }
        : { left: pct(todayX), transform: "translateX(-50%)" };

  return (
    // data-reveal-state is stamped by the RevealController pre-hydration.
    <div data-reveal="pacing-bar" suppressHydrationWarning>
      <div className="mb-0.5 flex items-baseline justify-end text-xs">
        <span className="font-medium tabular-nums">{percent(pctSpent)}</span>
      </div>
      <div className="relative h-4 w-full">
        <div aria-hidden className="absolute inset-0 text-foreground/15" style={TICKS_BOLD} />
        {g.ghostStart !== null && g.ghostEnd !== null && (
          <div
            data-reveal-bar
            className="absolute inset-0 text-foreground/35"
            style={{
              ...TICKS_BOLD,
              clipPath: cut(g.ghostStart, g.ghostEnd),
              animationDelay: "260ms",
            }}
          />
        )}
        <div
          data-reveal-bar
          className={`absolute inset-0 ${fill}`}
          style={{ ...TICKS_BOLD, clipPath: cut(0, g.fill), animationDelay: "80ms" }}
        />
        {g.marker < 1 && (
          <div
            aria-hidden
            className="absolute inset-y-0 w-px bg-foreground/70"
            style={{ left: pct(g.marker) }}
          />
        )}
      </div>
      <div className="relative mt-1 h-6">
        <div
          aria-hidden
          className="absolute top-0 h-1.5 w-px bg-foreground/50"
          style={{ left: pct(todayX) }}
        />
        <span
          className="absolute top-2 text-xs whitespace-nowrap text-muted-foreground tabular-nums"
          style={todayLabelStyle}
        >
          {c.today(dayOfPeriod, daysInPeriod)}
        </span>
      </div>
    </div>
  );
}
