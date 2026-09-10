import Link from "next/link";
import {
  RiCheckLine,
  RiContactsBookLine,
  RiPlugLine,
  RiWallet3Line,
  type RemixiconComponentType,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StateBadge } from "@/components/domain/state-badge";
import { cn } from "@/lib/utils";
import { homeCopy } from "./copy";

// Non-blocking onboarding guide (PRD cold-start → first verdict). Rendered
// full-size under the cold-start hero and as a compact strip on ready Home
// while any step is missing; it disappears by completion, never by dismissal.
// Each step carries its own illustration icon: the tile is the step's identity,
// the accent wash marks the current step, and a neutral badge marks done ones
// (semaphore colors stay reserved for budget status).

const steps: ReadonlyArray<{
  key: "connected" | "hasRoster" | "hasBudget";
  href: string;
  icon: RemixiconComponentType;
}> = [
  { key: "connected", href: "/ajustes/conexoes", icon: RiPlugLine },
  { key: "hasRoster", href: "/ajustes/roster", icon: RiContactsBookLine },
  { key: "hasBudget", href: "/ajustes/orcamentos", icon: RiWallet3Line },
];

type SetupState = { connected: boolean; hasRoster: boolean; hasBudget: boolean };

function StepTile({
  icon: Icon,
  state,
}: {
  icon: RemixiconComponentType;
  state: "done" | "next" | "todo";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-standard",
        state === "next" && "bg-brand-accent-muted text-brand-accent-light",
        state === "done" && "bg-muted text-muted-foreground",
        state === "todo" && "border border-border text-muted-foreground",
      )}
    >
      <Icon className="size-4" />
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
            <p className="mt-0.5 text-[11px] font-light text-muted-foreground tabular-nums">
              {homeCopy.setup.progress(doneCount, steps.length)}
            </p>
          </div>
          <ol className="flex flex-1 flex-wrap items-center gap-1.5">
            {steps.map((step) => {
              const done = state[step.key];
              const isNext = step.key === next.key;
              const label = homeCopy.setup[step.key];
              return (
                <li key={step.key}>
                  <Link
                    href={step.href}
                    aria-label={done ? homeCopy.setup.stepDone(label) : label}
                    aria-current={isNext ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-xs outline-none transition-colors duration-(--motion-duration-fast) ease-(--motion-ease-standard) hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring/40",
                      done ? "text-muted-foreground" : "font-medium",
                    )}
                  >
                    <step.icon
                      aria-hidden
                      className={cn(
                        "size-3.5 shrink-0",
                        isNext
                          ? "text-brand-accent-light"
                          : "text-muted-foreground",
                      )}
                    />
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
          <p className="text-xs font-light text-muted-foreground tabular-nums">
            {homeCopy.setup.progress(doneCount, steps.length)}
          </p>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div
          aria-hidden
          className="mb-4 h-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-brand-accent transition-[width] duration-(--motion-duration-standard) ease-(--motion-ease-standard)"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
          {steps.map((step) => {
            const done = state[step.key];
            const isNext = step.key === next.key;
            const label = homeCopy.setup[step.key];
            return (
              <li
                key={step.key}
                className="relative max-md:not-last:after:absolute max-md:not-last:after:top-[52px] max-md:not-last:after:bottom-[-12px] max-md:not-last:after:left-[33.5px] max-md:not-last:after:w-px max-md:not-last:after:bg-border max-md:not-last:after:content-['']"
              >
                <Link
                  href={step.href}
                  aria-label={done ? homeCopy.setup.stepDone(label) : label}
                  aria-current={isNext ? "step" : undefined}
                  className="flex h-full items-start gap-3 rounded-lg border p-4 outline-none transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard) hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <StepTile
                    icon={step.icon}
                    state={done ? "done" : isNext ? "next" : "todo"}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-sm font-medium",
                        done && "text-muted-foreground",
                      )}
                    >
                      {label}
                    </span>
                    <span className="mt-0.5 block text-xs/relaxed font-light text-muted-foreground">
                      {homeCopy.setup[`${step.key}Detail`]}
                    </span>
                    {done && (
                      <StateBadge icon={RiCheckLine} className="mt-2">
                        {homeCopy.setup.stepDoneBadge}
                      </StateBadge>
                    )}
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
