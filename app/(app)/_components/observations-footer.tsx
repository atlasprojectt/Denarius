import type { Apontamento } from "@/lib/findings/apontamentos";
import type { SeatWasteFinding } from "@/lib/findings/seats-vs-roster";
import { homeCopy } from "./copy";

// The calm "Observações" footer (#21/#22, PRD P14): apontamentos and the
// secondary seats-vs-roster findings are ambient decision support — muted
// styling, observation language, no red, no badges, no actions. Deliberately
// quieter than every other section on the home, and always below the budget
// items (waste is secondary by design).

const c = homeCopy.observations;

export function ObservationsFooter({
  items,
  seatWaste,
}: {
  items: Apontamento[];
  seatWaste: SeatWasteFinding[];
}) {
  if (items.length === 0 && seatWaste.length === 0) return null;

  return (
    <section className="rounded-xl border border-dashed p-4">
      <h2 className="text-sm font-medium text-muted-foreground">{c.title}</h2>
      <p className="text-xs text-muted-foreground/80">{c.subtitle}</p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {items.map((item) => (
          <ObservationLine key={item.id} text={item.text} />
        ))}
        {seatWaste.map((finding) => (
          <ObservationLine key={finding.id} text={finding.text} />
        ))}
      </ul>
      {seatWaste.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground/80">{c.seatsNote}</p>
      )}
    </section>
  );
}

function ObservationLine({ text }: { text: string }) {
  return (
    <li className="flex items-baseline gap-2 text-sm text-muted-foreground">
      <span aria-hidden className="select-none">
        ·
      </span>
      {text}
    </li>
  );
}
