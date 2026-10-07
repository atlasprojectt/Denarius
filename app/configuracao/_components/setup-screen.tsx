import Link from "next/link";

import { BudgetTableForm } from "@/components/domain/budget-table-form";
import { LogoWordmark } from "@/components/domain/logo";
import { Notice } from "@/components/domain/notice";
import { RosterUpload } from "@/components/domain/roster-upload";
import { stateIcons } from "@/components/domain/state-icons";
import { AppToastProvider } from "@/components/domain/toast-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { logout } from "@/lib/auth/actions";
import { budgetTableRows } from "@/lib/budgets/rows";
import { counted } from "@/lib/plural";
import type { SetupSnapshot } from "@/lib/setup/queries";
import {
  isStepDone,
  nextStep,
  previousStep,
  resolveSourceMode,
  SETUP_STEPS,
  type SetupProgress,
  type SetupStep,
} from "@/lib/setup/steps";

import { setupCopy } from "../copy";
import { CompanyStep } from "./company-step";
import { FinishSetupButton } from "./finish-setup-button";
import { SetupStepper } from "./setup-stepper";
import { SourcesStep } from "./sources-step";

function StepFooter({
  step,
  progress,
}: {
  step: SetupStep;
  progress: SetupProgress;
}) {
  const back = previousStep(step);
  const next = nextStep(step);
  const done = isStepDone(step, progress);

  return (
    <CardFooter className="justify-between gap-3 border-t">
      {back ? (
        <Button asChild variant="ghost">
          <Link href={`/configuracao?etapa=${back}`}>{setupCopy.back}</Link>
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button asChild variant={done ? "primary" : "ghost"}>
          <Link href={`/configuracao?etapa=${next}`}>
            {done ? setupCopy.next : setupCopy.skip}
          </Link>
        </Button>
      ) : (
        <FinishSetupButton skipping={!done} />
      )}
    </CardFooter>
  );
}

function StepBody({
  step,
  mode,
  snapshot,
}: {
  step: Exclude<SetupStep, "empresa">;
  mode: string | undefined;
  snapshot: SetupSnapshot;
}) {
  const { progress, teams, budgets } = snapshot;

  switch (step) {
    case "fontes":
      return (
        <SourcesStep
          mode={resolveSourceMode(mode, progress)}
          connections={snapshot.connections}
          subscriptions={snapshot.subscriptions}
          teams={teams}
          currency={snapshot.currency}
        />
      );
    case "times":
      return (
        <div className="flex flex-col gap-4">
          {progress.hasRoster && (
            <Notice icon={stateIcons.done}>
              {setupCopy.roster.imported(
                counted(snapshot.rosterCount, "pessoa", "pessoas"),
                counted(teams.length, "time", "times"),
              )}{" "}
              {setupCopy.roster.reimport}
            </Notice>
          )}
          <RosterUpload />
        </div>
      );
    case "orcamento":
      return (
        <BudgetTableForm
          rows={budgetTableRows(budgets.org, budgets.teams, teams, setupCopy.budget.orgRow)}
          currency={budgets.currency}
        />
      );
  }
}

/** The setup's presentation: logo bar, stepper, and the one centered card.
 *  `snapshot` is null until the company exists. */
export function SetupScreen({
  step,
  mode,
  progress,
  snapshot,
  defaultCompanyName,
}: {
  step: SetupStep;
  mode: string | undefined;
  progress: SetupProgress;
  snapshot: SetupSnapshot | null;
  defaultCompanyName: string;
}) {
  const stepCopy = setupCopy.steps[step];

  return (
    <AppToastProvider>
      <div className="flex min-h-svh flex-col bg-background">
        <header className="flex items-center justify-between px-4 py-4 sm:px-8">
          <LogoWordmark className="h-6 w-auto" />
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              {setupCopy.logout}
            </Button>
          </form>
        </header>

        <main className="flex flex-1 justify-center px-4 pt-2 pb-12 sm:pt-8">
          <div className="flex w-full max-w-2xl flex-col gap-6">
            <SetupStepper current={step} progress={progress} />

            <Card className="overflow-visible">
              <CardHeader>
                <p className="label-caps text-muted-foreground tabular-nums">
                  {setupCopy.stepOf(SETUP_STEPS.indexOf(step) + 1, SETUP_STEPS.length)}
                </p>
                <h1 className="mt-1 text-xl text-foreground">{stepCopy.title}</h1>
                <CardDescription className="text-sm/relaxed">
                  {stepCopy.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {step === "empresa" || !snapshot ? (
                  <CompanyStep defaultCompanyName={defaultCompanyName} />
                ) : (
                  <StepBody step={step} mode={mode} snapshot={snapshot} />
                )}
              </CardContent>
              {step !== "empresa" && <StepFooter step={step} progress={progress} />}
            </Card>

            {step !== "empresa" && (
              <p className="text-center text-xs text-muted-foreground">
                {setupCopy.laterNote}
              </p>
            )}
          </div>
        </main>
      </div>
    </AppToastProvider>
  );
}
