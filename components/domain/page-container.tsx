import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const widths = {
  // The cockpit fills the monitor — no max-width cap (founder direction
  // 2026-07-09/11: the big spend number is the product identity and the
  // analytical rows benefit from the full horizontal space).
  full: "max-w-none",
  wide: "max-w-7xl",
  default: "max-w-5xl",
  form: "max-w-3xl",
} as const;

export type PageContainerProps = ComponentProps<"div"> & {
  variant?: keyof typeof widths;
};

/** One deliberate width system for every app route (PRD P16). */
export function PageContainer({
  variant = "default",
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
