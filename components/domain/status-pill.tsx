import { StateBadge, type StateBadgeTone } from "@/components/domain/state-badge";
import type { VerdictStatus } from "@/lib/engine/verdict";

// Budget status as a small pill. Unified 2026-07-21 (founder-directed) onto the
// shadcnui-blocks "Badge 08 Soft" recipe: the same soft dot badge used for
// non-budget StateBadge states, so the whole app speaks one badge language.
// Semaphore colors (green/amber/red) stay reserved for budget status only
// (product principle #5) — here green is the compliant, canonical use; the
// emerald "positive" tone doubles as the healthy-connection badge. "collecting"
// is the neutral pre-day-5 state and never wears a judgement color.

const copy: Record<VerdictStatus, string> = {
  green: "No controle",
  amber: "Atenção",
  red: "Estourado",
  collecting: "Coletando",
};

const tone: Record<VerdictStatus, StateBadgeTone> = {
  green: "positive",
  amber: "amber",
  red: "destructive",
  collecting: "neutral",
};

export function StatusPill({
  status,
  label,
}: {
  status: VerdictStatus;
  label?: string;
}) {
  return <StateBadge tone={tone[status]}>{label ?? copy[status]}</StateBadge>;
}
