import type { RemixiconComponentType } from "@remixicon/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// The app's one badge language: a compact icon-led pill whose foreground color
// is repeated as a 10% wash. The icon is required so every badge communicates
// its meaning without depending on color alone. StatusPill delegates here too.
//
// Icons are Hugeicons data — except the provider brand marks (OpenAI/Anthropic
// in the attribution map), which stay Remix components by explicit request,
// so the prop accepts both and renders accordingly.
export type StateBadgeIcon = IconSvgElement | RemixiconComponentType;

function isIconData(icon: StateBadgeIcon): icon is IconSvgElement {
  return Array.isArray(icon);
}

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
  icon: StateBadgeIcon;
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
        "h-5 border-0 font-sans text-2xs font-semibold shadow-none opacity-100 [&>svg]:size-3!",
        toneClasses[tone],
        className,
      )}
    >
      {isIconData(Icon) ? (
        <HugeiconsIcon icon={Icon} data-icon="inline-start" aria-hidden />
      ) : (
        <Icon data-icon="inline-start" aria-hidden />
      )}
      {children}
    </Badge>
  );
}
