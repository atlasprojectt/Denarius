import { barGeometry } from "@/lib/bars";
import type { VerdictStatus } from "@/lib/engine/verdict";

// Hand-rolled budget bar (frontend F3: a progress bar is not a chart). Fill =
// spent, dashed ghost = run-rate projection past spend, the vertical marker =
// the budget line. Geometry (scaling for overruns) is the pure barGeometry
// helper; this component only paints it. Fill color follows budget status —
// semaphore discipline (product principle #5).

const fillColor: Record<VerdictStatus, string> = {
  green: "bg-status-green",
  amber: "bg-status-amber",
  red: "bg-status-red",
  collecting: "bg-muted-foreground",
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
    <div
      className={`relative h-2.5 w-full overflow-hidden rounded-full bg-muted ${className}`}
    >
      {/* Run-rate ghost: dashed, from spend to the projected close. */}
      {g.ghostStart !== null && g.ghostEnd !== null && (
        <div
          className="absolute inset-y-0 border-y border-r border-dashed border-foreground/40 bg-foreground/5"
          style={{ left: pct(g.ghostStart), width: pct(g.ghostEnd - g.ghostStart) }}
        />
      )}
      {/* Filled portion: what's been spent. */}
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${fillColor[status]}`}
        style={{ width: pct(g.fill) }}
      />
      {/* Budget marker: the 100% line. Hidden when spend/projection sit at the
          very edge (marker == 1) so it doesn't merge with the track end. */}
      {g.marker < 1 && (
        <div
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/70"
          style={{ left: pct(g.marker) }}
        />
      )}
    </div>
  );
}
