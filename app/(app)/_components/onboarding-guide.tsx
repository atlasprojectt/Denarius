import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ContactBookIcon,
  Plug01Icon,
  Tick01Icon,
  Wallet03Icon,
} from "@hugeicons/core-free-icons";

import { StateBadge } from "@/components/domain/state-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { homeCopy } from "./copy";

type SetupKey = "connected" | "hasRoster" | "hasBudget";

type SetupState = Record<SetupKey, boolean>;

type SetupStep = {
  key: SetupKey;
  href: string;
  icon: IconSvgElement;
};

const steps: readonly SetupStep[] = [
  { key: "connected", href: "/ajustes/conexoes", icon: Plug01Icon },
  { key: "hasRoster", href: "/ajustes/roster", icon: ContactBookIcon },
  { key: "hasBudget", href: "/ajustes/orcamentos", icon: Wallet03Icon },
];

function firstIncompleteStep(state: SetupState): SetupStep | undefined {
  return steps.find((step) => !state[step.key]);
}

function StepIcon({ icon, active = false }: { icon: IconSvgElement; active?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-standard",
        active
          ? "bg-brand-accent-muted text-brand-accent-light"
          : "bg-muted text-muted-foreground",
      )}
    >
      <HugeiconsIcon icon={icon} className="size-4" />
    </span>
  );
}

function StepList({
  state,
  next,
}: {
  state: SetupState;
  next: SetupStep;
}) {
  const nextIndex = steps.findIndex((step) => step.key === next.key);
  const laterSteps = steps.slice(nextIndex + 1);

  return (
    <div className="grid gap-2">
      {laterSteps.length === 0 && (
        <p className="rounded-standard border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          {homeCopy.setup.afterEmpty}
        </p>
      )}
      {laterSteps.map((step) => (
        <Link
          key={step.key}
          href={step.href}
          className="flex items-center gap-3 rounded-standard border border-border px-3 py-2.5 text-sm outline-none transition-colors duration-(--motion-duration-fast) ease-(--motion-ease-standard) hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <StepIcon icon={step.icon} />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{homeCopy.setup[step.key]}</span>
            <span className="block text-xs/relaxed font-light text-muted-foreground">
              {homeCopy.setup[`${step.key}Detail`]}
            </span>
          </span>
          {state[step.key] && (
            <StateBadge icon={Tick01Icon}>{homeCopy.setup.stepDoneBadge}</StateBadge>
          )}
        </Link>
      ))}
    </div>
  );
}

export function OnboardingGuide({
  state,
  variant = "full",
}: {
  state: SetupState;
  variant?: "full" | "compact";
}) {
  const doneCount = steps.filter((step) => state[step.key]).length;
  const next = firstIncompleteStep(state);

  if (!next) return null;

  if (variant === "compact") {
    return (
      <Card className="py-3">
        <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2.5 px-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium">{homeCopy.setup.compactTitle}</p>
            <p className="mt-0.5 text-[11px] font-light text-muted-foreground tabular-nums">
              {homeCopy.setup.progress(doneCount, steps.length)}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <StepIcon icon={next.icon} active />
            <span className="min-w-0 truncate font-medium">{homeCopy.setup[`${next.key}Now`]}</span>
          </div>
          <Button asChild size="sm">
            <Link href={next.href}>{homeCopy.setup.openStep}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible">
      <CardHeader className="border-b border-border">
        <StateBadge icon={Plug01Icon}>{homeCopy.setup.eyebrow}</StateBadge>
        <CardTitle as="h2" className="mt-1 text-lg tracking-tight">
          {homeCopy.setup.title}
        </CardTitle>
        <CardDescription className="max-w-2xl text-sm/relaxed">
          {homeCopy.setup.subtitle}
        </CardDescription>
        <div className="mt-3 flex items-center gap-3">
          <div
            aria-hidden
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-brand-accent transition-[width] duration-(--motion-duration-standard) ease-(--motion-ease-standard)"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-light text-muted-foreground tabular-nums">
            {homeCopy.setup.progress(doneCount, steps.length)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 pt-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)]">
        <section aria-labelledby="onboarding-now" className="min-w-0">
          <p id="onboarding-now" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {homeCopy.setup.nowLabel}
          </p>
          <div className="mt-2 flex items-start gap-3 rounded-xl border border-brand-accent-border bg-brand-accent-muted/40 p-4">
            <StepIcon icon={next.icon} active />
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold tracking-tight">{homeCopy.setup[next.key]}</h3>
              <p className="mt-1 text-sm/relaxed text-muted-foreground">
                {homeCopy.setup[`${next.key}Detail`]}
              </p>
              <Button asChild className="mt-4">
                <Link href={next.href}>{homeCopy.setup.openStep}</Link>
              </Button>
            </div>
          </div>
        </section>

        <section aria-labelledby="onboarding-after" className="min-w-0">
          <p id="onboarding-after" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {homeCopy.setup.afterLabel}
          </p>
          <div className="mt-2">
            <StepList state={state} next={next} />
            {steps.slice(0, steps.findIndex((step) => step.key === next.key)).length > 0 && (
              <p className="mt-3 text-xs font-light text-muted-foreground">
                {homeCopy.setup.completedBefore(doneCount)}
              </p>
            )}
          </div>
        </section>

        <section className="border-t border-border pt-5 lg:col-span-2" aria-labelledby="onboarding-complete">
          <p id="onboarding-complete" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {homeCopy.setup.completeLabel}
          </p>
          <p className="mt-2 text-sm/relaxed text-muted-foreground">{homeCopy.setup.completeBody}</p>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            {homeCopy.setup.outcomes.map((outcome) => (
              <li key={outcome} className="flex items-start gap-2">
                <HugeiconsIcon icon={Tick01Icon} className="mt-0.5 size-4 shrink-0 text-brand-accent-light" aria-hidden />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  );
}
