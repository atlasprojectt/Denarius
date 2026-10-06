// The guided setup (PRD P3, 2026-10-05): one centered card walks a new Admin
// through company → spend sources → people → budget. Pure: the route reads
// the tenant's progress and these functions decide what the card shows.

export const SETUP_STEPS = ["empresa", "fontes", "times", "orcamento"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/** How the spend-sources step is satisfied: live provider APIs, or seat plans
 *  entered by hand for a company that has no Admin key at hand. */
export const SOURCE_MODES = ["apis", "assinaturas"] as const;
export type SourceMode = (typeof SOURCE_MODES)[number];

/** Home query flag that opens the one-time welcome dialog after setup. */
export const WELCOME_PARAM = "bem-vindo";

export type SetupProgress = {
  hasCompany: boolean;
  hasActiveConnection: boolean;
  hasSubscriptions: boolean;
  hasRoster: boolean;
  hasBudget: boolean;
};

export function isStepDone(step: SetupStep, progress: SetupProgress): boolean {
  switch (step) {
    case "empresa":
      return progress.hasCompany;
    case "fontes":
      return progress.hasActiveConnection || progress.hasSubscriptions;
    case "times":
      return progress.hasRoster;
    case "orcamento":
      return progress.hasBudget;
  }
}

function isSetupStep(value: string | undefined): value is SetupStep {
  return (SETUP_STEPS as readonly string[]).includes(value ?? "");
}

/**
 * The step the card renders. Without a company nothing else can exist, so the
 * company step wins over any request; once it exists it is never revisited
 * here (the name is edited in Ajustes). Otherwise an explicit, valid request
 * is honored — that is how "skip" and "back" move — and the default is the
 * first step still missing, or the last step when everything is done.
 */
export function resolveStep(
  requested: string | undefined,
  progress: SetupProgress,
): SetupStep {
  if (!progress.hasCompany) return "empresa";
  if (isSetupStep(requested) && requested !== "empresa") return requested;
  return (
    SETUP_STEPS.find((step) => !isStepDone(step, progress)) ??
    SETUP_STEPS[SETUP_STEPS.length - 1]
  );
}

export function nextStep(step: SetupStep): SetupStep | null {
  return SETUP_STEPS[SETUP_STEPS.indexOf(step) + 1] ?? null;
}

/** The company step is a one-way door: going back from sources leads nowhere. */
export function previousStep(step: SetupStep): SetupStep | null {
  const previous = SETUP_STEPS[SETUP_STEPS.indexOf(step) - 1];
  return previous && previous !== "empresa" ? previous : null;
}

/** Hand-entered seats without any live connection reopen on that tab, so a
 *  returning Admin sees what they already did; everyone else starts on APIs. */
export function resolveSourceMode(
  requested: string | undefined,
  progress: SetupProgress,
): SourceMode {
  if ((SOURCE_MODES as readonly string[]).includes(requested ?? "")) {
    return requested as SourceMode;
  }
  return progress.hasSubscriptions && !progress.hasActiveConnection
    ? "assinaturas"
    : "apis";
}
