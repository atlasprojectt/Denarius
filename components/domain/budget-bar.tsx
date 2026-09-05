import { barGeometry, cut, TICKS } from "@/lib/bars";
import type { VerdictStatus } from "@/lib/engine/verdict";

// Hand-rolled budget bar (frontend F3: a progress bar is not a chart), painted
// as a segmented tick bar (2026-07 restyle, one texture family with the hero
// pacing pair). Fill = spent, ghost = run-rate projection past spend, the
// vertical marker = the budget line. Geometry (scaling for overruns) is the
// pure barGeometry helper; this component only paints it. Every layer is the
// same full-width tick grid cut by clip-path so tick columns align; fill vs
// ghost vs track read by color strength alone. Fill color follows budget
// status — semaphore discipline (product principle #5).

const fillColor: Record<VerdictStatus, string> = {
  green: "text-status-green",
  amber: "text-status-amber",
  red: "text-status-red",
  collecting: "text-muted-foreground",
};

export function BudgetBar({
  pctSpent,
  pctProjected,
  status,
  className = "",
}: {
  pctSpent: number;
  pctProjected: number | null;
  status: VerdictStatus;
  className?: string;
}) {
  const g = barGeometry(pctSpent, pctProjected);
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

  return (
    <div className={`relative h-2.5 w-full ${className}`}>
      {/* Track: the faint full-width tick grid. */}
      <div aria-hidden className="absolute inset-0 text-foreground/15" style={TICKS} />
      {/* Run-rate ghost: neutral ticks from spend to the projected close. */}
      {g.ghostStart !== null && g.ghostEnd !== null && (
        <div
          className="absolute inset-0 text-foreground/15"
          style={{ ...TICKS, clipPath: cut(g.ghostStart, g.ghostEnd) }}
        />
      )}
      {/* Filled portion: what's been spent. */}
      <div
        className={`absolute inset-0 ${fillColor[status]}`}
        style={{ ...TICKS, clipPath: cut(0, g.fill) }}
      />
      {/* Budget marker: the 100% line. Hidden when spend/projection sit at the
          very edge (marker == 1) so it doesn't merge with the track end. */}
      {g.marker < 1 && (
        <div
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/80"
          style={{ left: pct(g.marker) }}
        />
      )}
    </div>
  );
}
