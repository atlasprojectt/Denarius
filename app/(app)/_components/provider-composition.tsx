import type { ReactNode } from "react";
import Link from "next/link";
import { RiArrowRightSLine, RiGroupLine } from "@remixicon/react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProviderIcon } from "@/components/domain/provider-icon";
import { Button } from "@/components/ui/button";
import { cut, TICKS } from "@/lib/bars";
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
// hero's) and the explainer moved into the title's InfoTip.

const c = homeCopy.composition;

const chartColors = [
  "color-mix(in oklab, var(--foreground) 72%, transparent)",
  "color-mix(in oklab, var(--foreground) 58%, transparent)",
  "color-mix(in oklab, var(--foreground) 46%, transparent)",
  "color-mix(in oklab, var(--foreground) 36%, transparent)",
  "color-mix(in oklab, var(--foreground) 28%, transparent)",
];

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
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          {c.title}
          <InfoTip label={c.title}>{c.info}</InfoTip>
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
            <ul className="flex flex-1 flex-col justify-evenly gap-3">
              {entries.map((entry, index) => (
                <li
                  key={entry.key}
                  data-reveal-legend
                  style={{ animationDelay: `${120 + index * 70}ms` }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      {entryIcon[entry.key] && (
                        <span className="shrink-0 self-center">
                          {entryIcon[entry.key]}
                        </span>
                      )}
                      <span className="truncate font-medium">{entry.label}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {c.entryValue(money(entry.amount, currency), percent(entry.share))}
                    </span>
                  </div>
                  <div className="relative mt-1.5 h-2 w-full">
                    <div
                      aria-hidden
                      className="absolute inset-0 text-foreground/15"
                      style={TICKS}
                    />
                    <div
                      data-reveal-bar
                      className="absolute inset-0"
                      style={{
                        ...TICKS,
                        color: chartColors[index % chartColors.length],
                        clipPath: cut(0, entry.share),
                        animationDelay: `${160 + index * 90}ms`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
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
              shape="pill"
              motion="forward"
              className="ml-1 bg-muted/15 text-foreground/75"
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
