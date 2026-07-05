import type { VerdictStatus } from "@/lib/engine/verdict";

// Budget status as a small pill. Semaphore colors (green/amber/red) are reserved
// for budget status only (product principle #5); "collecting" is the neutral
// pre-day-5 state and gets a plain gray, never a judgement color.

const copy: Record<VerdictStatus, string> = {
  green: "No controle",
  amber: "Atenção",
  red: "Estourado",
  collecting: "Coletando",
};

const styles: Record<VerdictStatus, string> = {
  green: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  collecting: "bg-muted text-muted-foreground",
};

export function StatusPill({ status }: { status: VerdictStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {copy[status]}
    </span>
  );
}
