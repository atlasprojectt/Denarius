import type { CSSProperties } from "react";

import { barGeometry } from "@/lib/bars";
import type { VerdictStatus } from "@/lib/engine/verdict";
import { percent } from "@/lib/format";
import { homeCopy } from "./copy";

// The spend-vs-time pacing pair (frontend §3.4): a "Gasto %" bar over a
// "Mês: dia N de M" bar, sharing ONE scale so the budget line and the
// month-end line land at the same x — the whole point is the eye comparing
// "spent 90%" against "only 75% through the month". Rendered as segmented
// tick bars (2026-07 restyle): texture only — the spend fill keeps the
// semaphore color (principle #5) and geometry still comes from barGeometry.

const c = homeCopy.hero;

// Every layer paints the SAME full-width tick grid (currentColor) and is cut
// by clip-path, so track/fill/ghost tick columns always align — a left-offset
// layer would start its own grid.
const TICKS: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 6px)",
};

/** clip-path inset cutting a full-width layer to the [from..to] fraction. */
const cut = (from: number, to: number): string =>
  `inset(0 ${((1 - to) * 100).toFixed(2)}% 0 ${(from * 100).toFixed(2)}%)`;

export function PacingPair({
  pctSpent,
  pctProjected,
  pctElapsed,
  status,
  dayOfPeriod,
  daysInPeriod,
}: {
  pctSpent: number;
  pctProjected: number | null;
  pctElapsed: number;
  status: VerdictStatus;
  dayOfPeriod: number;
  daysInPeriod: number;
}) {
  const g = barGeometry(pctSpent, pctProjected);
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
  // Any value's x on the shared scale: value ÷ scale = value × marker (marker = 1/scale).
  const at = (v: number) => v * g.marker;

  const fill: Record<VerdictStatus, string> = {
    green: "text-status-green",
    amber: "text-status-amber",
    red: "text-status-red",
    collecting: "text-muted-foreground",
  };

  return (
    // data-reveal-state is stamped by the RevealController pre-hydration.
    <div data-reveal="pacing-pair" suppressHydrationWarning className="flex flex-col gap-3">
      {/* Spend bar */}
      <div>
        <div className="mb-1 flex items-baseline justify-between text-xs text-muted-foreground">
          <span>{c.pacingSpend}</span>
          <span className="tabular-nums">{percent(pctSpent)}</span>
        </div>
        <div className="relative h-3.5 w-full">
          <div aria-hidden className="absolute inset-0 text-foreground/15" style={TICKS} />
          {g.ghostStart !== null && g.ghostEnd !== null && (
            <div
              data-reveal-bar
              className="absolute inset-0 text-foreground/35"
              style={{
                ...TICKS,
                clipPath: cut(g.ghostStart, g.ghostEnd),
                animationDelay: "260ms",
              }}
            />
          )}
          <div
            data-reveal-bar
            className={`absolute inset-0 ${fill[status]}`}
            style={{ ...TICKS, clipPath: cut(0, g.fill), animationDelay: "80ms" }}
          />
          {g.marker < 1 && (
            <div
              aria-hidden
              className="absolute inset-y-0 w-px bg-foreground/70"
              style={{ left: pct(g.marker) }}
            />
          )}
        </div>
      </div>

      {/* Time bar — neutral (not a budget status), same scale, same marker x. */}
      <div>
        <div className="mb-1 flex items-baseline justify-between text-xs text-muted-foreground">
          <span>{c.pacingTime(dayOfPeriod, daysInPeriod)}</span>
          <span className="tabular-nums">{percent(pctElapsed)}</span>
        </div>
        <div className="relative h-3.5 w-full">
          <div aria-hidden className="absolute inset-0 text-foreground/15" style={TICKS} />
          <div
            data-reveal-bar
            className="absolute inset-0 text-foreground/40"
            style={{
              ...TICKS,
              clipPath: cut(0, at(pctElapsed)),
              animationDelay: "180ms",
            }}
          />
          {g.marker < 1 && (
            <div
              aria-hidden
              className="absolute inset-y-0 w-px bg-foreground/70"
              style={{ left: pct(g.marker) }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
