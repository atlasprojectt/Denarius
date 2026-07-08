import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CompositionEntry } from "@/lib/engine/cockpit";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { homeCopy } from "./copy";

// "Para onde vai o dinheiro" (frontend §3.8): a ranked provider bar list, NOT a
// donut. Neutral bars — this is composition, not budget status, so no semaphore
// colors (product principle #5). Tokens/models stay in the Explore drill-down.

const c = homeCopy.composition;

export function ProviderComposition({
  entries,
  currency,
}: {
  entries: CompositionEntry[];
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{c.title}</CardTitle>
        <CardDescription>{c.drillNote}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.empty}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {entries.map((entry) => (
              <li key={entry.key} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{entry.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {money(entry.amount, currency)}{" "}
                    <span className="text-xs">({percent(entry.share)})</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/50"
                    style={{ width: `${(entry.share * 100).toFixed(2)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
