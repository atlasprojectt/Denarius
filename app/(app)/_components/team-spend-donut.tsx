import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TeamSpendEntry } from "@/lib/engine/cockpit";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { homeCopy } from "./copy";

const c = homeCopy.teamSpend;

const palette = [
  "var(--primary)",
  "color-mix(in oklab, var(--primary) 74%, white)",
  "color-mix(in oklab, var(--foreground) 56%, transparent)",
  "color-mix(in oklab, var(--foreground) 36%, transparent)",
  "color-mix(in oklab, var(--foreground) 22%, transparent)",
  "color-mix(in oklab, var(--muted-foreground) 48%, transparent)",
];

function donutBackground(entries: TeamSpendEntry[]): string {
  let cursor = 0;
  const stops = entries.map((entry, index) => {
    const start = cursor;
    const end = cursor + entry.share * 100;
    cursor = end;
    const color = palette[index % palette.length];
    return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function TeamSpendDonut({
  entries,
  currency,
}: {
  entries: TeamSpendEntry[];
  currency: string;
}) {
  const topEntries = entries.slice(0, 5);
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{c.title}</CardTitle>
        <CardDescription>{c.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.empty}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[180px_minmax(0,1fr)]">
            <div className="relative mx-auto aspect-square w-44 rounded-full p-5">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: donutBackground(entries) }}
                aria-hidden
              />
              <div className="absolute inset-5 rounded-full bg-card shadow-inner" />
              <div className="relative flex h-full flex-col items-center justify-center text-center">
                <span className="text-xs text-muted-foreground">{c.total}</span>
                <strong className="mt-1 text-lg tabular-nums">
                  {money(total, currency)}
                </strong>
              </div>
            </div>

            <ul className="flex min-w-0 flex-col gap-3">
              {topEntries.map((entry, index) => (
                <li key={entry.teamId} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 size-2.5 shrink-0 rounded-full"
                    style={{ background: palette[index % palette.length] }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{entry.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {percent(entry.share)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {money(entry.amount, currency)}
                    </p>
                  </div>
                </li>
              ))}
              {entries.length > topEntries.length && (
                <li className="text-xs text-muted-foreground">
                  {c.more(entries.length - topEntries.length)}
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
