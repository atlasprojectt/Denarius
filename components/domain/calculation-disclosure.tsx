"use client";

import { useState, type ReactNode } from "react";
import { RiArrowDownSLine } from "@remixicon/react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// The one "how was this calculated" disclosure surface (F5 domain component —
// Explorar and the team drill-down). Callers own the body; the trigger and
// content chrome stay identical across screens.
export function CalculationDisclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-standard px-3 py-2 text-left text-xs font-medium text-muted-foreground outline-none transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard) hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40">
        {title}
        <RiArrowDownSLine
          aria-hidden
          className={cn(
            "size-4 shrink-0 transition-transform duration-(--motion-duration-fast) ease-(--motion-ease-standard) motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mx-3 border-t border-border pt-3 pb-1 text-xs/relaxed text-muted-foreground">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
