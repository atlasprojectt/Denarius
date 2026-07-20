import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Soft semantic badge for compact non-budget states (connection failures,
// data-quality flags, pending invitations). Styling copies the shadcnui-blocks
// "Badge 08 Soft" recipe verbatim (founder-directed 2026-07-20): status dot +
// the block's own palette, no adaptation to the --status-* tokens. Green is
// still not offered — the semaphore stays budget-only (principle #5).

export type StateBadgeTone = "neutral" | "amber" | "destructive";

const toneClasses: Record<StateBadgeTone, string> = {
  neutral: "gap-1.5 text-muted-foreground",
  amber:
    "gap-1.5 border-transparent bg-amber-600/10 text-amber-500 shadow-none hover:bg-amber-600/10 dark:bg-amber-600/20",
  destructive: "gap-1.5",
};

const dotClasses: Record<StateBadgeTone, string> = {
  neutral: "bg-muted-foreground",
  amber: "bg-amber-500",
  destructive: "bg-red-400",
};

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
      <div className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])} />
      {children}
    </Badge>
  );
}
