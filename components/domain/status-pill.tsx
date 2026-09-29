import type { IconSvgElement } from "@hugeicons/react";
import {
  AlertCircleIcon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";

import { StateBadge, type StateBadgeTone } from "@/components/domain/state-badge";
import type { VerdictStatus } from "@/lib/engine/verdict";

// Budget status keeps its public status/label API while delegating the shared
// icon-led geometry to StateBadge. Semaphore colors (green/amber/red) stay
// reserved for budget status, except for the documented healthy-connection
// state. "collecting" is the neutral pre-day-5 state and never implies judgment.

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

const icon: Record<VerdictStatus, IconSvgElement> = {
  green: CheckmarkCircle02Icon,
  amber: AlertCircleIcon,
  red: CancelCircleIcon,
  collecting: Clock01Icon,
};

export function StatusPill({
  status,
  label,
}: {
  status: VerdictStatus;
  label?: string;
}) {
  return (
    <StateBadge icon={icon[status]} tone={tone[status]}>
      {label ?? copy[status]}
    </StateBadge>
  );
}
