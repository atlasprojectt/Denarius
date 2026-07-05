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
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="font-semibold">{c.title}</h2>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{c.empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span>{entry.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {money(entry.amount, currency)}{" "}
                  <span className="text-xs">({percent(entry.share)})</span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground/40"
                  style={{ width: `${(entry.share * 100).toFixed(2)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted-foreground">{c.drillNote}</p>
    </section>
  );
}
