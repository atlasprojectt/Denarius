"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";

import { BudgetBar } from "@/components/domain/budget-bar";
import { StatusPill } from "@/components/domain/status-pill";
import { Button } from "@/components/ui/button";
import type { ControlAction } from "@/lib/findings/catalog";
import type { ThresholdLevel } from "@/lib/engine/thresholds";
import type { VerdictStatus } from "@/lib/engine/verdict";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { SimulateDrawer } from "@/components/domain/simulate-drawer";
import { BudgetEditDialog } from "./budget-edit-dialog";
import { homeCopy } from "./copy";

// One "needs attention" row (frontend §3.5): name + status pill + values, a bar
// with the run-rate ghost, a warning line, and the three inline actions
// [Investigar] [Simular] [✎]. Expands to reveal the curated control plan. All
// numbers are engine-provided; this component only formats and lays them out.

const c = homeCopy.needsAttention;

export type TeamRowData = {
  teamId: string;
  teamName: string;
  status: VerdictStatus;
  level: ThresholdLevel;
  pctSpent: number;
  pctProjected: number | null;
  budget: number;
  spent: number;
  projection: number | null;
  warnPct: number;
  controlPlan: ControlAction[];
  currency: string;
  /** Org aggregates the simulator recomputes against (#21). */
  orgProjection: number | null;
  orgBudget: number;
};

function warningLine(row: TeamRowData): string {
  const { currency } = row;
  if (row.level === "breach") {
    return c.warnBreach(money(row.spent, currency), money(row.budget, currency), percent(row.pctSpent));
  }
  if (row.level === "projected_breach" && row.projection !== null) {
    const over = money(row.projection - row.budget, currency);
    return c.warnProjected(money(row.projection, currency), over);
  }
  return c.warnThreshold(percent(row.pctSpent));
}

export function TeamRow({ row }: { row: TeamRowData }) {
  const [showPlan, setShowPlan] = useState(false);
  const { currency } = row;

  return (
    <li className="rounded-xl border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="truncate text-sm font-semibold">{row.teamName}</span>
          <StatusPill status={row.status} />
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          {c.ofBudget(money(row.spent, currency), money(row.budget, currency))}
        </span>
      </div>

      <BudgetBar
        className="mt-3.5"
        pctSpent={row.pctSpent}
        pctProjected={row.pctProjected}
        status={row.status}
      />

      <p className="mt-3 text-sm/relaxed">{warningLine(row)}</p>

      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t pt-3.5">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/explorar/time/${row.teamId}`}>
            <MagnifyingGlassIcon className="size-3.5" />
            {c.investigate}
          </Link>
        </Button>
        <SimulateDrawer
          teamName={row.teamName}
          currency={currency}
          team={{ spent: row.spent, projection: row.projection, budget: row.budget }}
          org={{ projection: row.orgProjection, budget: row.orgBudget }}
        />
        <BudgetEditDialog
          scope="team"
          teamId={row.teamId}
          teamName={row.teamName}
          currency={currency}
          amount={row.budget}
          warnPct={row.warnPct}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPlan((v) => !v)}
          aria-expanded={showPlan}
          className="ml-auto text-muted-foreground"
        >
          {showPlan ? c.hidePlan : c.showPlan}
          <CaretDownIcon
            className={`size-3.5 transition-transform ${showPlan ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      {showPlan && (
        <div className="mt-3 rounded-lg bg-muted/50 p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {c.planTitle}
          </p>
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {row.controlPlan.map((action) => (
              <li key={action.id}>
                <p className="text-sm font-medium">{action.title}</p>
                <p className="mt-0.5 text-xs/relaxed text-muted-foreground">
                  {action.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
