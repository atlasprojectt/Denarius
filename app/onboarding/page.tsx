import { redirect } from "next/navigation";

import { LogoWordmark } from "@/components/domain/logo";
import { ThemeToggle } from "@/components/domain/theme-toggle";
import { createClient } from "@/lib/supabase/server";

import { OnboardingForm } from "./_components/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already bootstrapped (RLS: a user only ever sees their own row).
  const { data: existing } = await supabase
    .from("app_user")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) redirect("/");

  // Prefill from signup metadata; Google users arrive with no company name.
  const defaultCompanyName =
    typeof user.user_metadata?.company_name === "string"
      ? user.user_metadata.company_name
      : "";

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <ThemeToggle className="absolute top-6 right-6" />
      <LogoWordmark className="h-7 w-auto" />
      <div className="w-full max-w-sm">
        <OnboardingForm defaultCompanyName={defaultCompanyName} />
      </div>
    </div>
  );
}
