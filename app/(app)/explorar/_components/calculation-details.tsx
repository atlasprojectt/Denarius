import { CalculationDisclosure } from "@/components/domain/calculation-disclosure";

const copy = {
  trigger: "Como estes valores foram calculados",
};

export type CalculationItem = {
  label: string;
  value: string;
};

export function CalculationDetails({
  items,
  notes,
}: {
  items: CalculationItem[];
  notes: string[];
}) {
  return (
    <CalculationDisclosure title={copy.trigger}>
      <div className="grid gap-3 md:grid-cols-2">
        <dl className="grid gap-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-4">
              <dt>{item.label}</dt>
              <dd className="text-right font-medium text-foreground tabular-nums">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="grid content-start gap-1.5">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      </div>
    </CalculationDisclosure>
  );
}
