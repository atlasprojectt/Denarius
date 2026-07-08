import { barGeometry } from "@/lib/bars";
import type { VerdictStatus } from "@/lib/engine/verdict";
import { percent } from "@/lib/format";
import { homeCopy } from "./copy";

// The spend-vs-time pacing pair (frontend §3.4): a "Gasto %" bar over a
// "Mês: dia N de M" bar, sharing ONE scale so the budget line and the
// month-end line land at the same x — the whole point is the eye comparing
// "spent 90%" against "only 75% through the month". Pure display; geometry
// comes from barGeometry.

const c = homeCopy.hero;

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
    green: "bg-status-green",
    amber: "bg-status-amber",
    red: "bg-status-red",
    collecting: "bg-muted-foreground",
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Spend bar */}
      <div>
        <div className="mb-1 flex items-baseline justify-between text-xs text-muted-foreground">
          <span>{c.pacingSpend}</span>
          <span className="tabular-nums">{percent(pctSpent)}</span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {g.ghostStart !== null && g.ghostEnd !== null && (
            <div
              className="absolute inset-y-0 border-y border-r border-dashed border-foreground/40 bg-foreground/5"
              style={{ left: pct(g.ghostStart), width: pct(g.ghostEnd - g.ghostStart) }}
            />
          )}
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${fill[status]}`}
            style={{ width: pct(g.fill) }}
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
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground/30"
            style={{ width: pct(at(pctElapsed)) }}
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
