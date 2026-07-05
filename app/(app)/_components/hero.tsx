import type { BudgetEvaluation } from "@/lib/engine/budget";
import type { VerdictStatus } from "@/lib/engine/verdict";
import { money } from "@/lib/money";
import { BudgetEditDialog } from "./budget-edit-dialog";
import { PacingPair } from "./pacing-pair";
import { homeCopy } from "./copy";

// The hero (frontend §3.4): org spend as the big money number, the pacing pair,
// and the projected-margin callout — the headline that the verdict line above
// summarizes. Money headlines; the inline pencil edits the org budget.

const c = homeCopy.hero;

export function Hero({
  org,
  status,
  orgWarnPct,
  unconvertedUsd,
  pctProjected,
  currency,
  dayOfPeriod,
  daysInPeriod,
}: {
  org: BudgetEvaluation;
  status: VerdictStatus;
  orgWarnPct: number;
  unconvertedUsd: number;
  pctProjected: number | null;
  currency: string;
  dayOfPeriod: number;
  daysInPeriod: number;
}) {
  const callout = org.collecting
    ? c.collecting
    : org.projectedMargin !== null && org.projectedMargin < 0
      ? c.projectedOver(money(-org.projectedMargin, currency))
      : c.projectedUnder(money(org.projectedMargin ?? 0, currency));

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{c.spentLabel}</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums">
              {money(org.spent, currency)}
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {c.ofBudget(money(org.budget, currency))}
            </span>
          </p>
        </div>
        <BudgetEditDialog
          scope="org"
          teamId={null}
          currency={currency}
          amount={org.budget}
          warnPct={orgWarnPct}
          triggerLabel={c.editBudget}
        />
      </div>

      <div className="mt-6">
        <PacingPair
          pctSpent={org.pctSpent}
          pctProjected={pctProjected}
          pctElapsed={org.pctElapsed}
          status={status}
          dayOfPeriod={dayOfPeriod}
          daysInPeriod={daysInPeriod}
        />
      </div>

      <p className="mt-4 text-sm">{callout}</p>

      {unconvertedUsd > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {c.unconverted(money(unconvertedUsd, "USD"))}
        </p>
      )}
    </section>
  );
}
