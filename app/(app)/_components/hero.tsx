import { HugeiconsIcon } from "@hugeicons/react";
import { Wallet03Icon } from "@hugeicons/core-free-icons";

import { PacingBar } from "@/components/domain/pacing-bar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BudgetEvaluation } from "@/lib/engine/budget";
import { signedPercent } from "@/lib/format";
import { money } from "@/lib/money";
import { homeCopy } from "./copy";

// The hero (frontend §3.4, de-noise 2026-07-17): org spend as the big money
// number — the product's identity, dominant by SUBTRACTION — over one pacing
// bar read against the day of the period, and a single KPI (projeção de fechamento;
// the projected margin's home is now the verdict sentence). Read-only by
// design: budget editing lives in /ajustes/orcamentos. The unconverted-USD
// note (invariant #4) stays as the card's honesty footer — never a tooltip.

const c = homeCopy.hero;

/** Below this |Δ| the week-over-week line says nothing and hides (display
 *  threshold, not engine state — a "0,0%" line is noise). */
const WEEK_DELTA_MIN = 0.005;

/** Week-over-week line under the big number: plain text, no pill. The figure
 *  is the one delta allowed to carry the semaphore (founder exception to
 *  principle #5, 2026-10-04): red when spend rose, green when it fell. The
 *  sign states the direction, so color is never the only cue. */
function WeekDelta({ pct }: { pct: number | null }) {
  if (pct === null || Math.abs(pct) < WEEK_DELTA_MIN) return null;
  const tone = pct > 0 ? "text-status-red-fg" : "text-status-green-fg";
  return (
    <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-sm">
      <span className={`font-medium tabular-nums ${tone}`}>
        {signedPercent(pct, 1)}
      </span>
      <span className="text-ink-secondary">{c.weekDeltaLabel}</span>
    </p>
  );
}

export function Hero({
  org,
  pctProjected,
  unconvertedUsd,
  currency,
  dayOfPeriod,
  daysInPeriod,
  weekPct,
}: {
  org: BudgetEvaluation;
  pctProjected: number | null;
  unconvertedUsd: number;
  currency: string;
  dayOfPeriod: number;
  daysInPeriod: number;
  /** Org week-over-week API cost change; null hides the line. */
  weekPct: number | null;
}) {
  const projectionValue = org.collecting
    ? `— ${c.collectingShort}`
    : money(org.projection ?? 0, currency);

  return (
    <Card className="min-h-full" aria-labelledby="home-hero-title">
      <CardHeader>
        <CardTitle as="h2" id="home-hero-title" className="flex items-center gap-2 text-sm font-medium">
          <HugeiconsIcon icon={Wallet03Icon} className="size-4 text-ink-faint" aria-hidden />
          {c.title}
        </CardTitle>
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 pt-1.5 text-display-sm font-normal tabular-nums [overflow-wrap:anywhere] md:text-display">
          {money(org.spent, currency)}
          <span className="basis-full text-base font-normal tracking-normal text-ink-secondary sm:basis-auto">
            {c.ofBudget(money(org.budget, currency))}
          </span>
        </p>
        <WeekDelta pct={weekPct} />
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">

        <PacingBar
          pctSpent={org.pctSpent}
          pctProjected={pctProjected}
          dayOfPeriod={dayOfPeriod}
          daysInPeriod={daysInPeriod}
        />

        {/* ONE KPI (de-noise): the projection is the decision number left in
            this card — the projected margin moved into the verdict sentence,
            and the old callout repeated it in words. Neutral ink (principle #5). */}
        <dl className="border-t pt-3">
          <div className="min-w-0">
            <dt className="truncate text-xs text-muted-foreground">{c.kpiProjection}</dt>
            <dd className="mt-1 text-lg font-medium tabular-nums">{projectionValue}</dd>
          </div>
        </dl>

        {unconvertedUsd > 0 && (
          <p className="text-xs text-muted-foreground">
            {c.unconverted(money(unconvertedUsd, "USD"))}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
