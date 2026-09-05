import type { ReactNode } from "react";

import { cut, TICKS } from "@/lib/bars";
import { cn } from "@/lib/utils";

// Ranked composition rows — label, amount, and a tick bar cut to the row's
// share (2026-08-01, founder-directed from a reference recording). Hovering a
// row thickens and brightens its bar, so the eye lands on one source at a time
// without the list ever moving.
//
// The bars are brand-accent, not semaphore: composition is not budget status,
// and orange is the brand's accent rather than a verdict color (principle #5).
// Values arrive pre-formatted — this component never phrases and never
// computes (F2, invariant #2). The hover is pure CSS, so it stays a Server
// Component; entrance animation rides the existing RevealController hooks.

export type RankedTickRow = {
  key: string;
  /** Optional leading mark (provider logo, seat icon). */
  icon?: ReactNode;
  label: string;
  /** Pre-formatted by the caller (money, share). */
  value: string;
  /** Portion of the track to fill, 0..1. */
  share: number;
};

export function RankedTickList({
  rows,
  className,
}: {
  rows: RankedTickRow[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-1 flex-col justify-evenly gap-3", className)}>
      {rows.map((row, index) => (
        <li
          key={row.key}
          className="group/row"
          data-reveal-legend
          style={{ animationDelay: `${120 + index * 70}ms` }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              {row.icon && (
                <span className="shrink-0 self-center">{row.icon}</span>
              )}
              <span className="truncate font-medium">{row.label}</span>
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {row.value}
            </span>
          </div>
          <div className="relative mt-1.5 h-2 w-full">
            <div
              aria-hidden
              className="absolute inset-0 origin-center text-foreground/15 group-hover/row:scale-y-[1.5] group-hover/row:text-foreground/15 motion-safe:transition-[color,transform] motion-safe:duration-(--motion-duration-max) motion-safe:ease-(--motion-ease-standard)"
              style={TICKS}
            />
            <div
              data-reveal-bar
              className="absolute inset-0 origin-center text-brand-accent group-hover/row:scale-y-[1.5] group-hover/row:brightness-115 motion-safe:transition-[filter,transform] motion-safe:duration-(--motion-duration-max) motion-safe:ease-(--motion-ease-standard)"
              style={{
                ...TICKS,
                clipPath: cut(0, row.share),
                animationDelay: `${160 + index * 90}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
