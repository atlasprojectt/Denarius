import {
  RiArrowDownCircleFill,
  RiArrowUpCircleFill,
  RiWallet3Line,
} from "@remixicon/react";

import { StateBadge } from "@/components/domain/state-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BudgetEvaluation } from "@/lib/engine/budget";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { PacingBar } from "./pacing-bar";
import { homeCopy } from "./copy";

// The hero (frontend §3.4, de-noise 2026-07-17): org spend as the big money
// number — the product's identity, dominant by SUBTRACTION — over one pacing
// bar with the "hoje" time marker, and a single KPI (projeção de fechamento;
// the projected margin's home is now the verdict sentence). Read-only by
// design: budget editing lives in /ajustes/orcamentos. The unconverted-USD
// note (invariant #4) stays as the card's honesty footer — never a tooltip.

const c = homeCopy.hero;

/** Below this |Δ| the week-over-week pill says nothing and hides (display
 *  threshold, not engine state — a "0,0%" chip is noise). */
const WEEK_DELTA_MIN = 0.005;

/** Week-over-week pill under the big number. Deliberately NEUTRAL (principle
 *  #5): spending more isn't inherently bad, so the arrow informs direction
 *  without judging it — the signed percent carries it for screen readers. */
function WeekDelta({ pct }: { pct: number | null }) {
  if (pct === null || Math.abs(pct) < WEEK_DELTA_MIN) return null;
  const Arrow = pct < 0 ? RiArrowDownCircleFill : RiArrowUpCircleFill;
  const signed = `${pct > 0 ? "+" : ""}${percent(pct, 1)}`;
  return (
    <StateBadge icon={Arrow} className="mt-1">
      <span className="tabular-nums">{c.weekDelta(signed)}</span>
    </StateBadge>
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
  /** Org week-over-week API cost change; null hides the chip. */
  weekPct: number | null;
}) {
  const projectionValue = org.collecting
    ? `— ${c.collectingShort}`
    : money(org.projection ?? 0, currency);

  return (
    <Card className="min-h-full">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <RiWallet3Line className="size-4 text-muted-foreground" aria-hidden />
          {c.title}
        </CardTitle>
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 pt-2 text-[clamp(1.875rem,10vw,3rem)] font-medium tracking-tight tabular-nums [overflow-wrap:anywhere]">
          {money(org.spent, currency)}
          <span className="text-base font-normal tracking-normal text-muted-foreground">
            {c.ofBudget(money(org.budget, currency))}
          </span>
        </p>
        <WeekDelta pct={weekPct} />
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">

        <PacingBar
          pctSpent={org.pctSpent}
          pctProjected={pctProjected}
          pctElapsed={org.pctElapsed}
          dayOfPeriod={dayOfPeriod}
          daysInPeriod={daysInPeriod}
        />

        {/* ONE KPI (de-noise): the projection is the decision number left in
            this card — the projected margin moved into the verdict sentence,
            and the old callout repeated it in words. Neutral ink (principle #5). */}
        <dl className="border-t pt-4">
          <div className="min-w-0">
            <dt className="truncate text-xs text-muted-foreground">{c.kpiProjection}</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums">{projectionValue}</dd>
          </div>
        </dl>

        {unconvertedUsd > 0 && (
          <p className="text-xs/relaxed text-muted-foreground">
            {c.unconverted(money(unconvertedUsd, "USD"))}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
