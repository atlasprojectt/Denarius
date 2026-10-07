import type { ReactNode } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import { stateIcons } from "@/components/domain/state-icons";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// Soft persistent notice for data-quality disclosures (FX missing, unattributed
// spend, sync failures, reconciliation gaps). Calm by default (principle #6):
// it observes, never alarms — amber is the data-quality tint (FX-footer
// precedent), destructive is reserved for a sync that is actually failing, and
// green never appears here (semaphore is budget-only, principle #5).
//
// It speaks the badge language at block scale: the tone's ink on a 10% wash of
// itself, so it reads the same on the page and inside a card. The icon defaults
// to the tone's glyph in the icon grammar (state-icons).

export type NoticeTone = "neutral" | "amber" | "destructive";

const toneClasses: Record<NoticeTone, string> = {
  neutral: "border-badge-neutral/15 bg-badge-neutral-soft",
  amber:
    "border-badge-amber/25 bg-badge-amber-soft text-badge-amber *:data-[slot=alert-description]:text-badge-amber",
  destructive:
    "border-badge-destructive/25 bg-badge-destructive-soft text-badge-destructive *:data-[slot=alert-description]:text-badge-destructive",
};

const toneIcon: Record<NoticeTone, IconSvgElement> = {
  neutral: stateIcons.info,
  amber: stateIcons.attention,
  destructive: stateIcons.failure,
};

export function Notice({
  tone = "neutral",
  icon,
  title,
  action,
  className,
  children,
}: {
  tone?: NoticeTone;
  /** Overrides the tone's glyph with a context icon (e.g. a pie chart). */
  icon?: IconSvgElement;
  title?: string;
  /** Optional right-aligned action (pass a Button/Link). */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Alert
      // A persistent disclosure is ambient context, not an interruption; only a
      // real failure warrants the assertive live region.
      role={tone === "destructive" ? "alert" : "status"}
      className={cn(
        "px-3 py-2.5",
        // The action takes its own column, sized by its label, instead of a
        // fixed right padding the text has to guess around.
        action && "has-[>svg]:grid-cols-[auto_1fr_auto] has-data-[slot=alert-action]:pr-3",
        toneClasses[tone],
        className,
      )}
    >
      <HugeiconsIcon icon={icon ?? toneIcon[tone]} className="size-4" aria-hidden />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription className="col-start-2">{children}</AlertDescription>
      {action && (
        <AlertAction className="static col-start-3 row-span-2 row-start-1 self-center pl-2">
          {action}
        </AlertAction>
      )}
    </Alert>
  );
}
