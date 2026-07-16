import { RiArrowDownSFill, RiArrowUpSFill } from "@remixicon/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BudgetEvaluation } from "@/lib/engine/budget";
import type { VerdictStatus } from "@/lib/engine/verdict";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { PacingPair } from "./pacing-pair";
import { homeCopy } from "./copy";

// The hero (frontend §3.4): org spend as the big money number — the product's
// identity — over the pacing pair, a small KPI strip (projection, projected
// margin, day of month) and the projected-margin callout. Read-only by design
// (redesign 2026-07): budget editing lives in /ajustes/orcamentos, reached from
// the teams table below, so nothing here opens dialogs or competes with the
// number. The unconverted-USD note (invariant #4) is the card's honesty footer.

const c = homeCopy.hero;

function Kpi({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  /** The overrun headline (margem projetada) — the single place the delta
   *  renders in headline weight. Neutral ink: semaphore stays on the
   *  verdict/pills (principle #5). */
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`mt-0.5 tabular-nums ${
          emphasis ? "text-base font-semibold" : "text-sm font-medium"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/** Week-over-week pill under the big number. Deliberately NEUTRAL (principle
 *  #5): spending more isn't inherently bad, so the arrow informs direction
 *  without judging it — the signed percent carries it for screen readers. */
function WeekDelta({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const Arrow = pct < 0 ? RiArrowDownSFill : RiArrowUpSFill;
  const signed = `${pct > 0 ? "+" : ""}${percent(pct, 1)}`;
  return (
    <p className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">
      {pct !== 0 && <Arrow className="size-3.5 shrink-0" aria-hidden />}
      {c.weekDelta(signed)}
    </p>
  );
}

export function Hero({
  org,
  status,
  pctProjected,
  unconvertedUsd,
  currency,
  dayOfPeriod,
  daysInPeriod,
  weekPct,
}: {
  org: BudgetEvaluation;
  status: VerdictStatus;
  pctProjected: number | null;
  unconvertedUsd: number;
  currency: string;
  dayOfPeriod: number;
  daysInPeriod: number;
  /** Org week-over-week API cost change; null hides the chip. */
  weekPct: number | null;
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
    <Card size="sm" className="min-h-full">
      <CardHeader>
        <CardDescription>{c.spentLabel}</CardDescription>
        <CardTitle className="flex flex-wrap items-baseline gap-x-2.5 text-4xl tracking-tight tabular-nums sm:text-5xl">
          {money(org.spent, currency)}
          <span className="text-base font-normal tracking-normal text-muted-foreground">
            {c.ofBudget(money(org.budget, currency))}
          </span>
        </CardTitle>
        <WeekDelta pct={weekPct} />
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <PacingPair
          pctSpent={org.pctSpent}
          pctProjected={pctProjected}
          pctElapsed={org.pctElapsed}
          status={status}
          dayOfPeriod={dayOfPeriod}
          daysInPeriod={daysInPeriod}
        />

        {/* Two KPIs, not three: the day-of-month figure already lives in the
            verdict meta line and the time bar — a third copy was noise.
            Margem projetada carries the emphasis: it is the decision number,
            and the ONE headline-weight rendering of the overrun (the callout
            sentence below is support, not a second headline). */}
        <dl className="grid grid-cols-2 gap-4 border-t pt-3">
          <Kpi label={c.kpiProjection} value={projectionValue} />
          <Kpi label={c.kpiMargin} value={marginValue} emphasis />
        </dl>

        {/* Support line, not main flow (2026-07-16): the sentence repeats the
            margem's delta in words, so it reads as context under the KPIs —
            reduced type keeps the number said once in headline weight. A
            support line, not a tooltip: it must survive mobile. */}
        <div>
          <p className="text-xs/relaxed text-muted-foreground">{callout}</p>
          {unconvertedUsd > 0 && (
            <p className="mt-1.5 text-xs/relaxed text-muted-foreground">
              {c.unconverted(money(unconvertedUsd, "USD"))}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
