import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

import {
  isStepDone,
  SETUP_STEPS,
  type SetupProgress,
  type SetupStep,
} from "@/lib/setup/steps";
import { cn } from "@/lib/utils";

import { setupCopy } from "../copy";

function StepMarker({
  index,
  done,
  current,
}: {
  index: number;
  done: boolean;
  current: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium tabular-nums transition-colors duration-(--motion-duration-fast) ease-(--motion-ease-standard)",
        current
          ? "bg-foreground text-background"
          : done
            ? "bg-foreground/10 text-foreground"
            : "bg-muted text-muted-foreground",
      )}
    >
      {done && !current ? (
        <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
      ) : (
        index
      )}
    </span>
  );
}

/** Where the Admin is in the setup. Steps after the company can be revisited
 *  by clicking them; the company step is a one-way door. */
export function SetupStepper({
  current,
  progress,
}: {
  current: SetupStep;
  progress: SetupProgress;
}) {
  return (
    <ol aria-label={setupCopy.stepper} className="flex items-center gap-2 sm:gap-3">
      {SETUP_STEPS.map((step, i) => {
        const done = isStepDone(step, progress);
        const isCurrent = step === current;
        const label = setupCopy.steps[step].label;
        const content = (
          <>
            <StepMarker index={i + 1} done={done} current={isCurrent} />
            <span
              aria-hidden
              className={cn(
                "hidden truncate text-ui sm:inline",
                isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            <span className="sr-only">
              {`${label}${done ? `, ${setupCopy.done}` : ""}`}
            </span>
          </>
        );
        const navigable = progress.hasCompany && step !== "empresa" && !isCurrent;

        return (
          <li key={step} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {navigable ? (
              <Link
                href={`/configuracao?etapa=${step}`}
                className="-m-1 flex min-w-0 items-center gap-2 rounded-full p-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {content}
              </Link>
            ) : (
              <span
                aria-current={isCurrent ? "step" : undefined}
                className="flex min-w-0 items-center gap-2"
              >
                {content}
              </span>
            )}
            {i < SETUP_STEPS.length - 1 && (
              <span aria-hidden className="h-px min-w-3 flex-1 bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
