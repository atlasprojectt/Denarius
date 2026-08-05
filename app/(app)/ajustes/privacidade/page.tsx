import { redirect } from "next/navigation";

import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { currentRole } from "@/lib/auth/session";
import { canEditCompanySettings } from "@/lib/settings/account";
import { createClient } from "@/lib/supabase/server";
import { PrivacyForm } from "../_components/privacy-form";

const copy = {
  back: "Ajustes",
  title: "Privacidade",
  subtitle: "Controles de confiança e minimização de dados por pessoa.",
  cardTitle: "Controle, não vigilância",
  cardDescription: "Nomes individuais só aparecem no contexto de um time e quando a política permitir.",
};

export default async function PrivacySettingsPage() {
  const supabase = await createClient();
  const [{ data: tenantData }, role] = await Promise.all([
    supabase.from("tenant").select("show_names, store_per_person").maybeSingle(),
    currentRole(),
  ]);
  const tenant = tenantData as { show_names: boolean; store_per_person: boolean } | null;
  if (!tenant) redirect("/onboarding");
  const isAdmin = canEditCompanySettings(role ?? "viewer");

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
    </PageContainer>
  );
}
