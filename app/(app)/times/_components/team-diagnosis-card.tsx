"use client";

import { useEffect, useRef, useState } from "react";
import { RiArrowDownSLine } from "@remixicon/react";

import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// One team's diagnosis card shell (Fase 1 da reestruturação triagem/gestão):
// the collapse choreography only — header (summary row) and body (the full
// diagnosis) are SERVER-rendered nodes passed in as props, so this island
// carries no business logic and no data fetching (F1). `?focus=<id>` arrives
// as the `focused` prop: the card opens and scrolls itself into view — the
// Home warning lands the CEO directly on the team's diagnosis.

const copy = {
  toggle: (team: string) => `Ver diagnóstico de ${team}`,
};

export function TeamDiagnosisCard({
  teamName,
  focused,
  header,
  headerDetails,
  children,
}: {
  teamName: string;
  /** True when this team is the ?focus= target — opens and scrolls to it. */
  focused: boolean;
  /** Server-rendered title row (always visible, toggles the panel). */
  header: React.ReactNode;
  /** Server-rendered collapsed-only summary (numbers/bar/warning). Hidden
   *  while the card is open — the body's Estado e projeção carries the full
   *  picture, so the same numbers never render twice on one card. */
  headerDetails?: React.ReactNode;
  /** Server-rendered diagnosis body (mounts when expanded). */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(focused);
  const ref = useRef<HTMLDivElement>(null);

  // Client-side navigation can re-focus an already-mounted card (a second
  // warning clicked on Home) — adjust state during render, then scroll.
  const [prevFocused, setPrevFocused] = useState(focused);
  if (focused !== prevFocused) {
    setPrevFocused(focused);
    if (focused) setOpen(true);
  }

  useEffect(() => {
    if (focused) {
      ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [focused]);

  return (
    <Card ref={ref} className="scroll-mt-20 gap-0 py-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          aria-label={copy.toggle(teamName)}
          className="group/trigger flex w-full items-center gap-3 rounded-lg px-(--card-spacing) py-(--card-spacing) text-left outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30"
        >
          <div className="min-w-0 flex-1">
            {header}
            {!open && headerDetails}
          </div>
          <RiArrowDownSLine
            aria-hidden
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-5 border-t px-(--card-spacing) py-(--card-spacing)">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
