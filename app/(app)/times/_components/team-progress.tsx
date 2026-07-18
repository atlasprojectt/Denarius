import { barGeometry, cut, TICKS } from "@/lib/bars";
import type { VerdictStatus } from "@/lib/engine/verdict";
import { cn } from "@/lib/utils";

const copy = {
  label: "Gasto atual, projeção e marcador de orçamento",
};

export function TeamProgress({
  pctSpent,
  pctProjected,
  status,
  className,
}: {
  pctSpent: number;
  pctProjected: number | null;
  status: VerdictStatus;
  className?: string;
}) {
  const geometry = barGeometry(pctSpent, pctProjected);
  const pct = (value: number) => `${Math.max(0, value * 100).toFixed(2)}%`;
  const realizedTone = status === "red" ? "text-status-red" : "text-brand-accent";

  return (
    <div
      role="img"
      aria-label={copy.label}
      className={cn("relative h-2 w-full overflow-visible", className)}
    >
      <div aria-hidden className="absolute inset-0 text-foreground/15" style={TICKS} />
      {geometry.ghostStart !== null && geometry.ghostEnd !== null && (
        <div
          data-reveal-bar
          className="absolute inset-0 text-foreground/35"
          style={{
            ...TICKS,
            clipPath: cut(geometry.ghostStart, geometry.ghostEnd),
            animationDelay: "220ms",
          }}
        />
      )}
      <div
        data-reveal-bar
        className={cn("absolute inset-0", realizedTone)}
        style={{ ...TICKS, clipPath: cut(0, geometry.fill), animationDelay: "70ms" }}
      />
      {geometry.marker < 1 && (
        <span
          aria-hidden
          className="absolute inset-y-[-2px] w-px bg-foreground/70"
          style={{ left: pct(geometry.marker) }}
        />
      )}
    </div>
  );
}
