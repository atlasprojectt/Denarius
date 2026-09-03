import type { ReactNode } from "react";

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

export type NoticeTone = "neutral" | "amber" | "destructive";

const toneClasses: Record<NoticeTone, string> = {
  neutral: "border-border/70 bg-muted",
  amber:
    "border-status-amber/25 bg-status-amber-soft text-status-amber-fg *:data-[slot=alert-description]:text-status-amber-fg/85",
  destructive:
    "border-destructive/30 bg-destructive/5 text-destructive dark:bg-destructive/10 *:data-[slot=alert-description]:text-destructive/85",
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
  /** A direct svg icon (Remix icon) — the Alert grid keys off it. */
  icon?: ReactNode;
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
        "px-3 py-2.5 has-data-[slot=alert-action]:pr-28",
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
      {action && (
        <AlertAction className="top-1/2 right-3 -translate-y-1/2">
          {action}
        </AlertAction>
      )}
    </Alert>
  );
}
