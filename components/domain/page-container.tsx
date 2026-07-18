import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const widths = {
  // Home only: the cockpit fills the monitor — no max-width cap (founder
  // direction 2026-07-09/11: the big spend number is the product identity and
  // the analytical rows benefit from the full horizontal space).
  full: "max-w-none",
  // Default analytical and form width; narrower navigation hubs opt into the
  // settings variant explicitly rather than changing this shared default.
  wide: "max-w-7xl",
  // Navigation hubs use a contained, centered scanning measure instead of
  // stretching to the analytical dashboard width.
  settings: "max-w-5xl",
  // Personal preferences and other compact forms use a shorter reading line.
  form: "max-w-4xl",
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
