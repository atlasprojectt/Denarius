import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// The app's one soft badge. Styling copies the shadcnui-blocks "Badge 08 Soft"
// recipe verbatim (founder-directed 2026-07-20): status dot + the block's own
// palette, no adaptation to the --status-* tokens. Used for compact non-budget
// states (connection failures, data-quality flags, pending invitations, healthy
// connection) AND, since 2026-07-21, as the visual behind `StatusPill` so the
// budget semaphore shares one badge language across the whole app. All three
// block tones are offered: the emerald "positive" tone is the canonical
// budget-green (principle #5) and doubles as the healthy-connection badge (a
// founder-directed extension of green beyond budget status).
//
// Softened 2026-07-21 (founder-directed): every tone is borderless (the
// destructive tone's border is killed too) and the whole pill renders at 80%
// opacity for a calmer, more uniform look.

export type StateBadgeTone = "neutral" | "amber" | "positive" | "destructive";

const toneClasses: Record<StateBadgeTone, string> = {
  neutral: "gap-1.5 text-muted-foreground",
  amber:
    "gap-1.5 border-transparent bg-amber-600/10 text-amber-500 shadow-none hover:bg-amber-600/10 dark:bg-amber-600/20",
  positive:
    "gap-1.5 border-transparent bg-emerald-600/10 text-emerald-500 shadow-none hover:bg-emerald-600/10 dark:bg-emerald-600/20",
  destructive: "gap-1.5 border-transparent",
};

const dotClasses: Record<StateBadgeTone, string> = {
  neutral: "bg-muted-foreground",
  amber: "bg-amber-500",
  positive: "bg-emerald-500",
  destructive: "bg-red-400",
};

const toneVariant: Record<StateBadgeTone, "outline" | "default" | "destructive"> = {
  neutral: "outline",
  amber: "default",
  positive: "default",
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
    <Badge variant={toneVariant[tone]} className={cn("font-sans opacity-80", toneClasses[tone], className)}>
      <div className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])} />
      {children}
    </Badge>
  );
}
