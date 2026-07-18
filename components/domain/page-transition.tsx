import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type PageTransitionProps = ComponentProps<"div">;

/** Restrained route entrance for content below the persistent app chrome. */
export function PageTransition({
  className,
  ...props
}: PageTransitionProps) {
  return (
    <div
      data-page-transition
      className={cn(
        "page-transition flex min-w-0 flex-1 flex-col",
        className,
      )}
      {...props}
    />
  );
}
