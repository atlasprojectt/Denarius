import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { OnboardingForm } from "./_components/onboarding-form";

const copy = {
  brand: "Denarius",
};

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
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <span className="flex items-center gap-2 font-medium">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          D
        </span>
        {copy.brand}
      </span>
      <div className="w-full max-w-sm">
        <OnboardingForm defaultCompanyName={defaultCompanyName} />
      </div>
    </div>
  );
}
