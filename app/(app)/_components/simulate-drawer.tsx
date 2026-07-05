"use client";

import { SlidersHorizontalIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { homeCopy } from "./copy";

// The [Simular] hook (frontend §5: right-side drawer, opened in context from a
// team). This slice wires the drawer open with the team's real pacing (engine
// numbers, no computation here); the interactive what-if presets + slider land
// with the planning slice (#21). Values arrive pre-formatted from the server.

const c = homeCopy.simulate;

export function SimulateDrawer({
  teamName,
  spent,
  projected,
  budget,
}: {
  teamName: string;
  spent: string;
  projected: string;
  budget: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontalIcon className="size-4" />
          {c.title}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{c.title}</SheetTitle>
          <SheetDescription>{c.subtitle(teamName)}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {c.currentPace}
          </p>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{c.spent}</dt>
              <dd className="tabular-nums">{spent}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{c.projected}</dt>
              <dd className="tabular-nums">{projected}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{c.budget}</dt>
              <dd className="tabular-nums">{budget}</dd>
            </div>
          </dl>

          <p className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            {c.soon}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
