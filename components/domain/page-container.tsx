import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const widths = {
  // Home only: the cockpit fills the monitor — no max-width cap (founder
  // direction 2026-07-09/11: the big spend number is the product identity and
  // the analytical rows benefit from the full horizontal space).
  full: "max-w-none",
  // Every other screen shares ONE width (founder 2026-07-11): no width jumps
  // between routes — the audit's S7/QA-12 complaint — Home is the exception.
  wide: "max-w-7xl",
} as const;

export type PageContainerProps = ComponentProps<"div"> & {
  variant?: keyof typeof widths;
};

/** One deliberate width system for every app route (PRD P16). */
export function PageContainer({
  variant = "wide",
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      data-page-container={variant}
      className={cn("mx-auto flex w-full flex-col", widths[variant], className)}
      {...props}
    />
  );
}
