import * as React from "react";

import { cn } from "@/lib/utils";

function CockpitCard({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="cockpit-card"
      className={cn(
        "flex flex-col gap-1 overflow-hidden rounded-xl bg-sidebar p-1 text-xs/relaxed text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CockpitCardHeader({
  className,
  ...props
}: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="cockpit-card-header"
      className={cn("flex min-h-8 items-center px-3 py-1.5", className)}
      {...props}
    />
  );
}

function CockpitCardTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="cockpit-card-title"
      className={cn("font-heading text-sm font-medium", className)}
      {...props}
    />
  );
}

function CockpitCardFrame({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="cockpit-card-frame"
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-standard border bg-surface-canvas",
        className,
      )}
      {...props}
    />
  );
}

function CockpitCardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="cockpit-card-content"
      className={cn("p-4", className)}
      {...props}
    />
  );
}

function CockpitCardFooter({
  className,
  ...props
}: React.ComponentProps<"footer">) {
  return (
    <footer
      data-slot="cockpit-card-footer"
      className={cn("px-4 pb-4", className)}
      {...props}
    />
  );
}

export {
  CockpitCard,
  CockpitCardContent,
  CockpitCardFooter,
  CockpitCardFrame,
  CockpitCardHeader,
  CockpitCardTitle,
};
