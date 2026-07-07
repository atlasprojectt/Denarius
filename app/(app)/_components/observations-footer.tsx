import type { Observation } from "@/lib/home/queries";
import { homeCopy } from "./copy";

// The calm "Observações" footer (#21/#22, PRD P14): the observation feed is
// ambient decision support — muted styling, observation language, no red, no
// badges, no actions. Deliberately quieter than every other section on the
// home. Ordering (apontamentos, then secondary seats-vs-roster waste) is
// decided in the data layer; this component only renders the feed it's given.

const c = homeCopy.observations;

export function ObservationsFooter({
  items,
  hasSeatWaste,
}: {
  items: Observation[];
  hasSeatWaste: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-xl border border-dashed p-4">
      <h2 className="text-sm font-medium text-muted-foreground">{c.title}</h2>
      <p className="text-xs text-muted-foreground/80">{c.subtitle}</p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-baseline gap-2 text-sm text-muted-foreground"
          >
            <span aria-hidden className="select-none">
              ·
            </span>
            {item.text}
          </li>
        ))}
      </ul>
      {hasSeatWaste && (
        <p className="mt-3 text-xs text-muted-foreground/80">{c.seatsNote}</p>
      )}
    </section>
  );
}
