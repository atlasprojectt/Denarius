"use client";

import { useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";

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
      className="rounded-xl border bg-card p-4 shadow-sm"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-2 font-medium">
          <span className="text-green-600" aria-hidden>
            ✓
          </span>
          {c.title(teams.length)}
        </span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          {open ? c.collapse : c.expand}
          <CaretDownIcon
            className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 flex flex-col gap-3">
        {teams.map((team) => (
          <div key={team.teamId} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span>{team.teamName}</span>
              <span className="tabular-nums text-muted-foreground">
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
