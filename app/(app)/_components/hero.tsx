import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BudgetEvaluation } from "@/lib/engine/budget";
import type { VerdictStatus } from "@/lib/engine/verdict";
import { money } from "@/lib/money";
import { BudgetEditDialog } from "./budget-edit-dialog";
import { PacingPair } from "./pacing-pair";
import { homeCopy } from "./copy";

// The hero (frontend §3.4): org spend as the big money number, the pacing pair,
// a small KPI strip (projection + projected margin) and the projected-margin
// callout — the headline that the verdict line above summarizes. Money
// headlines; the inline pencil edits the org budget.

const c = homeCopy.hero;

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

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

  const projectionValue = org.collecting
    ? `— ${c.collectingShort}`
    : money(org.projection ?? 0, currency);
  const marginValue =
    org.collecting || org.projectedMargin === null
      ? `— ${c.collectingShort}`
      : money(org.projectedMargin, currency);

  return (
    <Card>
      <CardHeader>
        <CardDescription>{c.spentLabel}</CardDescription>
        <CardTitle className="flex flex-wrap items-baseline gap-x-2 text-3xl tabular-nums sm:text-4xl">
          {money(org.spent, currency)}
          <span className="text-base font-normal text-muted-foreground">
            {c.ofBudget(money(org.budget, currency))}
          </span>
        </CardTitle>
        <CardAction>
          <BudgetEditDialog
            scope="org"
            teamId={null}
            currency={currency}
            amount={org.budget}
            warnPct={orgWarnPct}
            triggerLabel={c.editBudget}
          />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <PacingPair
          pctSpent={org.pctSpent}
          pctProjected={pctProjected}
          pctElapsed={org.pctElapsed}
          status={status}
          dayOfPeriod={dayOfPeriod}
          daysInPeriod={daysInPeriod}
        />

        <dl className="grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3">
          <Kpi label={c.kpiProjection} value={projectionValue} />
          <Kpi label={c.kpiMargin} value={marginValue} />
          <Kpi
            label={c.kpiPace}
            value={c.kpiPaceValue(dayOfPeriod, daysInPeriod)}
          />
        </dl>

        <div>
          <p className="text-sm/relaxed">{callout}</p>
          {unconvertedUsd > 0 && (
            <p className="mt-1 text-xs/relaxed text-muted-foreground">
              {c.unconverted(money(unconvertedUsd, "USD"))}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
