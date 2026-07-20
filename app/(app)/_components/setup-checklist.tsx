import Link from "next/link";
import { RiCheckLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { homeCopy } from "./copy";

// Non-blocking onboarding guide (PRD cold-start → first verdict). Rendered
// full-size under the cold-start hero and as a compact strip on ready Home
// while any step is missing; it disappears by completion, never by dismissal.

const steps = [
  { key: "connected", href: "/ajustes/conexoes" },
  { key: "hasRoster", href: "/ajustes/roster" },
  { key: "hasBudget", href: "/ajustes/orcamentos" },
] as const;

type SetupState = { connected: boolean; hasRoster: boolean; hasBudget: boolean };

function StepMarker({ done, index }: { done: boolean; index: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-medium tabular-nums",
        done
          ? "bg-muted text-muted-foreground"
          : "border border-border text-muted-foreground",
      )}
    >
      {done ? <RiCheckLine className="size-3" /> : index + 1}
    </span>
  );
}

export function SetupChecklist({
  state,
  variant = "full",
}: {
  state: SetupState;
  variant?: "full" | "compact";
}) {
  const doneCount = steps.filter((step) => state[step.key]).length;
  const next = steps.find((step) => !state[step.key]);
  if (!next) return null;

  if (variant === "compact") {
    return (
      <Card className="py-3">
        <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2.5 px-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium">{homeCopy.setup.title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
              {homeCopy.setup.progress(doneCount, steps.length)}
            </p>
          </div>
          <ol className="flex flex-1 flex-wrap items-center gap-1.5">
            {steps.map((step, index) => {
              const done = state[step.key];
              const label = homeCopy.setup[step.key];
              return (
                <li key={step.key}>
                  <Link
                    href={step.href}
                    aria-label={done ? homeCopy.setup.stepDone(label) : label}
                    className={cn(
                      "flex items-center gap-1.5 rounded-pill border py-1 pr-2.5 pl-1 text-xs outline-none transition-colors duration-(--motion-duration-fast) ease-(--motion-ease-standard) hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40",
                      done ? "text-muted-foreground" : "font-medium",
                    )}
                  >
                    <StepMarker done={done} index={index} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ol>
          <Button asChild size="sm">
            <Link href={next.href}>{homeCopy.setup.continue}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{homeCopy.setup.title}</CardTitle>
        <CardDescription>{homeCopy.setup.subtitle}</CardDescription>
        <CardAction>
          <p className="text-xs text-muted-foreground tabular-nums">
            {homeCopy.setup.progress(doneCount, steps.length)}
          </p>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => {
            const done = state[step.key];
            const label = homeCopy.setup[step.key];
            return (
              <li key={step.key}>
                <Link
                  href={step.href}
                  aria-label={done ? homeCopy.setup.stepDone(label) : label}
                  className="flex h-full items-start gap-3 rounded-lg border p-4 outline-none transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard) hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <StepMarker done={done} index={index} />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-sm font-medium",
                        done && "text-muted-foreground",
                      )}
                    >
                      {label}
                    </span>
                    <span className="mt-0.5 block text-xs/relaxed text-muted-foreground">
                      {homeCopy.setup[`${step.key}Detail`]}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        <Button asChild className="mt-5">
          <Link href={next.href}>{homeCopy.setup.continue}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
