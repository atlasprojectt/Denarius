import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Soft semantic badge for compact non-budget states (connection failures,
// data-quality flags, pending invitations). Semaphore colors stay reserved for
// budget status (StatusPill, principle #5): amber here marks data quality —
// the one non-budget tint the product already discloses in (the FX-missing
// footer precedent) — and green is deliberately not offered.

export type StateBadgeTone = "neutral" | "amber" | "destructive";

const toneClasses: Record<StateBadgeTone, string> = {
  neutral: "text-muted-foreground",
  amber: "border-status-amber/25 bg-status-amber-soft text-status-amber-fg",
  destructive: "",
};

// Amber rides the `default` variant (no dark:bg override to fight); the other
// tones map straight onto the existing Badge variants.
const toneVariant: Record<StateBadgeTone, "outline" | "default" | "destructive"> = {
  neutral: "outline",
  amber: "default",
  destructive: "destructive",
};

export function StateBadge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StateBadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge variant={toneVariant[tone]} className={cn(toneClasses[tone], className)}>
      {children}
    </Badge>
  );
}
