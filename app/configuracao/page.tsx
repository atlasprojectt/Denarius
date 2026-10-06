import { redirect } from "next/navigation";

import { getSetupSnapshot } from "@/lib/setup/queries";
import { resolveStep, type SetupProgress } from "@/lib/setup/steps";
import { createClient } from "@/lib/supabase/server";

import { SetupScreen } from "./_components/setup-screen";

// The guided setup (PRD P3, 2026-10-05): one centered card per step, outside
// the app shell. Every step's form is the same component Ajustes uses, so the
// setup is a guided path through existing settings, not a parallel copy of
// them. Progress is derived from real data on each render; the URL only says
// which step the Admin chose to look at.

const NO_COMPANY: SetupProgress = {
  hasCompany: false,
  hasActiveConnection: false,
  hasSubscriptions: false,
  hasRoster: false,
  hasBudget: false,
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string; modo?: string }>;
}) {
  const { etapa, modo } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: appUser } = await supabase
    .from("app_user")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  // A Viewer joined a company someone else configures.
  if (appUser && appUser.role !== "admin") redirect("/");

  const snapshot = appUser ? await getSetupSnapshot() : null;
  const progress = snapshot?.progress ?? NO_COMPANY;

  // Prefill from signup metadata; Google users arrive with no company name.
  const defaultCompanyName =
    typeof user.user_metadata?.company_name === "string"
      ? user.user_metadata.company_name
      : "";

  return (
    <SetupScreen
      step={resolveStep(etapa, progress)}
      mode={modo}
      progress={progress}
      snapshot={snapshot}
      defaultCompanyName={defaultCompanyName}
    />
  );
}
