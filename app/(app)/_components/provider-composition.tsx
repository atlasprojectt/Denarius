import type { ReactNode } from "react";
import Link from "next/link";
import {
  RiArrowRightSLine,
  RiGroupLine,
  RiPieChart2Line,
} from "@remixicon/react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProviderIcon } from "@/components/domain/provider-icon";
import { RankedTickList } from "@/components/domain/ranked-tick-list";
import { Button } from "@/components/ui/button";
import type { CompositionEntry } from "@/lib/engine/cockpit";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { InfoTip } from "./info-tip";
import { homeCopy } from "./copy";

// "Gasto por fonte" (frontend §3.7): provider/seat composition as ranked
// horizontal tick bars (2026-07 restyle — F3: hand-rolled CSS, the donut is
// gone). Each source is a provider mark + label, the amount with its share,
// and a tick bar cut to the share. Neutral chart-ramp colors — this is
// composition, not budget status, so no semaphore (product principle #5).
// De-noise 2026-07-17: the "Total convertido" block left (the total is the
// hero's) and the explainer moved into the title's InfoTip. The rows and their
// hover focus now come from the shared RankedTickList (2026-08-01).

const c = homeCopy.composition;

// Known composition keys → marks; unknown keys render without an icon.
const entryIcon: Record<string, ReactNode> = {
  openai: <ProviderIcon provider="openai" className="size-4" />,
  anthropic: <ProviderIcon provider="anthropic" className="size-4" />,
  seats: <RiGroupLine className="size-4 text-muted-foreground" aria-hidden />,
};

export function ProviderComposition({
  entries,
  currency,
  unattributed,
}: {
  entries: CompositionEntry[];
  currency: string;
  /** Spend inside these slices that no team claims yet (engine-combined at
   *  the frozen FX; `unconvertedUsd` > 0 means FX was missing for the API
   *  part). Null hides the reconciliation line — the page applies the
   *  cents-zero rule (invariant #3 disclosure, never a fourth slice: the
   *  team cut lives INSIDE the source cut, a slice would double-count). */
  unattributed: { display: number; unconvertedUsd: number } | null;
}) {
  const unattributedLine =
    unattributed === null
      ? null
      : unattributed.unconvertedUsd > 0
        ? c.unattributedNoFx(
            money(unattributed.display, currency),
            money(unattributed.unconvertedUsd, "USD"),
          )
        : c.unattributed(money(unattributed.display, currency));

  return (
    <Card size="sm" className="min-h-full">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm">
          <RiPieChart2Line className="size-4 text-muted-foreground" aria-hidden />
          {c.title}
          <span className="-ml-0.5">
            <InfoTip label={c.infoLabel}>{c.info}</InfoTip>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.empty}</p>
        ) : (
          <div
            data-reveal="composition"
            // data-reveal-state is stamped by the RevealController pre-hydration.
            // Distributed, not centered: the entry list spreads over whatever
            // height the hero gives the row, so a taller row widens the
            // breathing room between bars instead of pooling voids.
            suppressHydrationWarning
            className="flex flex-1 flex-col"
          >
            <RankedTickList
              rows={entries.map((entry) => ({
                key: entry.key,
                icon: entryIcon[entry.key],
                label: entry.label,
                value: c.entryValue(
                  money(entry.amount, currency),
                  percent(entry.share),
                ),
                share: entry.share,
              }))}
            />
          </div>
        )}
      </CardContent>
      {unattributedLine !== null && (
        <CardFooter className="text-xs/relaxed text-muted-foreground">
          <p className="tabular-nums">
            {unattributedLine} —{" "}
            <Button
              asChild
              variant="tertiary"
              size="sm"
              shape="full"
              motion="forward"
              className="ml-1 text-foreground/80"
            >
              <Link href="/ajustes/atribuicao">
                {c.mapCta}
                <RiArrowRightSLine className="size-3.5" data-icon="inline-end" aria-hidden />
              </Link>
            </Button>
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
