"use client";

import { useState } from "react";
import { IconChevronDown, IconCircleCheck } from "@tabler/icons-react";

import { BudgetBar } from "@/components/domain/budget-bar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { money } from "@/lib/money";
import { homeCopy } from "./copy";

// "Sob controle (N)" (frontend §3.6): healthy teams collapsed by default,
// expandable, with compact bars. Calm — no semaphore urgency; these are green.

const c = homeCopy.underControl;

export type UnderControlTeam = {
  teamId: string;
  teamName: string;
  pctSpent: number;
  pctProjected: number | null;
  spent: number;
  budget: number;
};

export function UnderControl({
  teams,
  currency,
}: {
  teams: UnderControlTeam[];
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  if (teams.length === 0) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border bg-card shadow-xs"
    >
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-xl p-5 text-left transition-colors hover:bg-muted/40">
        <span className="flex items-center gap-2.5 text-sm font-semibold">
          <IconCircleCheck
            aria-hidden
            className="size-4.5 text-status-green"
          />
          {c.title(teams.length)}
        </span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          {open ? c.collapse : c.expand}
          <IconChevronDown
            className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent className="flex flex-col gap-4 border-t px-5 pt-4 pb-5">
        {teams.map((team) => (
          <div key={team.teamId} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium">{team.teamName}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {c.ofBudget(money(team.spent, currency), money(team.budget, currency))}
              </span>
            </div>
            <BudgetBar
              pctSpent={team.pctSpent}
              pctProjected={team.pctProjected}
              status="green"
            />
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
