"use client";

import { RiInformationLine } from "@remixicon/react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// A ghost info icon beside a card title (de-noise 2026-07-17): the permanent
// explainer paragraphs that used to sit under the titles ("O mesmo gasto do
// período…") move in here, so the card breathes and the text is one hover/tap
// away. Keyboard-reachable button with a pt-BR aria-label; self-contained
// provider so the card doesn't need to wrap it.

export function InfoTip({ label, children }: { label: string; children: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-label={label}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <RiInformationLine className="size-4" aria-hidden />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs/relaxed">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
