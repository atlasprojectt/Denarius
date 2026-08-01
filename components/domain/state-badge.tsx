import type { RemixiconComponentType } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// The app's one badge language: a compact icon-led pill whose foreground color
// is repeated as a 10% wash. The icon is required so every badge communicates
// its meaning without depending on color alone. StatusPill delegates here too.

export type StateBadgeTone = "neutral" | "amber" | "positive" | "destructive";

const toneClasses: Record<StateBadgeTone, string> = {
  neutral: "bg-badge-neutral-soft text-badge-neutral",
  amber: "bg-badge-amber-soft text-badge-amber",
  positive: "bg-badge-positive-soft text-badge-positive",
  destructive: "bg-badge-destructive-soft text-badge-destructive",
};

export function StateBadge({
  icon: Icon,
  tone = "neutral",
  className,
  children,
}: {
  icon: RemixiconComponentType;
  tone?: StateBadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge
      variant="default"
      data-slot="state-badge"
      data-tone={tone}
      className={cn(
        "h-5 border-0 font-sans text-xs font-semibold shadow-none opacity-100 [&>svg]:size-3!",
        toneClasses[tone],
        className,
      )}
    >
      <Icon data-icon="inline-start" aria-hidden />
      {children}
    </Badge>
  );
}
