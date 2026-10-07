import type { IconSvgElement } from "@hugeicons/react";

import { StateBadge, type StateBadgeTone } from "@/components/domain/state-badge";
import { stateIcons } from "@/components/domain/state-icons";
import type { VerdictStatus } from "@/lib/engine/verdict";

// Budget status delegates the shared icon-led geometry to StateBadge.
// Semaphore colors (green/amber/red) stay reserved for budget status, except
// for the documented healthy-connection state. "collecting" is the neutral
// pre-day-5 state and never implies judgment.
//
// The labels are the product's names for the four states (product-analysis.md
// › states) and are fixed here: a screen never renames a status, so the same
// team reads the same on Home, Times and Relatórios.

const copy: Record<VerdictStatus, string> = {
  green: "No controle",
  amber: "Atenção",
  red: "Estourado",
  collecting: "Coletando ritmo",
};

const tone: Record<VerdictStatus, StateBadgeTone> = {
  green: "positive",
  amber: "amber",
  red: "destructive",
  collecting: "neutral",
};

const icon: Record<VerdictStatus, IconSvgElement> = {
  green: stateIcons.done,
  amber: stateIcons.attention,
  red: stateIcons.breached,
  collecting: stateIcons.pending,
};

export function StatusPill({ status }: { status: VerdictStatus }) {
  return (
    <StateBadge icon={icon[status]} tone={tone[status]}>
      {copy[status]}
    </StateBadge>
  );
}
