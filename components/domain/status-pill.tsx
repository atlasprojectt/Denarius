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

// Each pill carries a border in its own status tone (2026-07-12): the soft
// background alone read faint on dark surfaces — the border lifts the tag off
// the card and sharpens the semaphore signal.
const styles: Record<VerdictStatus, string> = {
  green: "border border-status-green/25 bg-status-green-soft text-status-green-fg",
  amber: "border border-status-amber/25 bg-status-amber-soft text-status-amber-fg",
  red: "border border-status-red/25 bg-status-red-soft text-status-red-fg",
  collecting: "border border-border bg-muted text-muted-foreground",
};

const dot: Record<VerdictStatus, string> = {
  green: "bg-status-green",
  amber: "bg-status-amber",
  red: "bg-status-red",
  collecting: "bg-muted-foreground",
};

export function StatusPill({
  status,
  label,
}: {
  status: VerdictStatus;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex h-5 items-center gap-1.5 rounded-pill px-2 text-xs font-medium ${styles[status]}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${dot[status]}`} />
      {label ?? copy[status]}
    </span>
  );
}
