import type { ReactNode } from "react";
import { RiGroupLine } from "@remixicon/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProviderIcon } from "@/components/domain/provider-icon";
import { cut, TICKS } from "@/lib/bars";
import type { CompositionEntry } from "@/lib/engine/cockpit";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { homeCopy } from "./copy";

// "Para onde vai o dinheiro" (frontend §3.8): provider/seat composition as
// ranked horizontal tick bars (2026-07 restyle — F3: hand-rolled CSS, the
// donut is gone). Each source is a provider mark + label, the amount with its
// share, and a tick bar cut to the share. Neutral chart-ramp colors — this is
// composition, not budget status, so no semaphore (product principle #5).

const c = homeCopy.composition;

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
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
}: {
  entries: CompositionEntry[];
  currency: string;
}) {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <Card className="min-h-full">
      <CardHeader>
        <CardTitle className="text-sm">{c.title}</CardTitle>
        <CardDescription>{c.drillNote}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.empty}</p>
        ) : (
          <div
            data-reveal="composition"
            // data-reveal-state is stamped by the RevealController pre-hydration.
            suppressHydrationWarning
            className="flex flex-1 flex-col justify-center gap-5"
          >
            <div data-reveal-legend>
              <p className="text-xs text-muted-foreground">{c.total}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {money(total, currency)}
              </p>
            </div>

            <ul className="flex flex-col gap-4">
              {entries.map((entry, index) => (
                <li
                  key={entry.key}
                  data-reveal-legend
                  style={{ animationDelay: `${120 + index * 70}ms` }}
                >
                  <div className="flex items-baseline justify-between gap-3 text-sm">
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
    </Card>
  );
}
