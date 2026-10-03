import { redirect } from "next/navigation";

import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { currentRole } from "@/lib/auth/session";
import { canEditCompanySettings, profileLabel } from "@/lib/settings/account";
import { createClient } from "@/lib/supabase/server";
import { PrivacyForm } from "../_components/privacy-form";
import { AccountDeletionCard } from "./_components/account-deletion-card";
import { DataRightsPanel } from "./_components/data-rights-panel";

const copy = {
  back: "Ajustes",
  title: "Privacidade e dados",
  subtitle: "Controles de confiança, minimização de dados e direitos do espaço.",
  cardTitle: "Controle, não vigilância",
  cardDescription: "Nomes individuais só aparecem no contexto de um time e quando a política permitir.",
};

export default async function PrivacySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tenantData }, { data: accountData }, role] = await Promise.all([
    supabase
      .from("tenant")
      .select("name, show_names, store_per_person")
      .maybeSingle(),
    supabase
      .from("app_user")
      .select("email, display_name")
      .eq("id", user.id)
      .maybeSingle(),
    currentRole(),
  ]);
  const tenant = tenantData as {
    name: string;
    show_names: boolean;
    store_per_person: boolean;
  } | null;
  const account = accountData as {
    email: string;
    display_name: string | null;
  } | null;
  if (!tenant || !account) redirect("/onboarding");
  const isAdmin = canEditCompanySettings(role ?? "viewer");
  const displayName = profileLabel({
    displayName: account.display_name,
    email: account.email,
  });

  return (
    <PageContainer variant="settings" className="gap-6">
      <PageHeader title={copy.title} description={copy.subtitle} backHref="/ajustes" backLabel={copy.back} />
      <Card>
        <CardHeader>
          <CardTitle>{copy.cardTitle}</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <PrivacyForm showNames={tenant.show_names} storePerPerson={tenant.store_per_person} isAdmin={isAdmin} />
        </CardContent>
      </Card>
      {isAdmin && <DataRightsPanel />}
      <AccountDeletionCard
        role={isAdmin ? "admin" : "viewer"}
        email={user.email ?? account.email}
        displayName={displayName}
        companyName={tenant.name}
      />
    </PageContainer>
  );
}
