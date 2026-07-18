import { CalculationDisclosure } from "@/components/domain/calculation-disclosure";

const copy = {
  title: "Como este gasto foi calculado",
};

export function SpendCalculationDetails({
  summary,
  notes,
}: {
  summary: string;
  notes: string[];
}) {
  return (
    <CalculationDisclosure title={copy.title}>
      <p className="tabular-nums">{summary}</p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-4">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </CalculationDisclosure>
  );
}
