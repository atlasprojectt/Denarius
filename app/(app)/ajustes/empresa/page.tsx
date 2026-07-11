import Link from "next/link";
import { redirect } from "next/navigation";
import { IconInfoCircle } from "@tabler/icons-react";

import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { canEditCompanySettings } from "@/lib/settings/account";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "../_components/company-form";
import { CurrencyForm } from "../_components/currency-form";

const copy = {
  back: "Ajustes",
  title: "Empresa e moeda",
  subtitle: "Identidade da empresa e moeda usada para apresentar o gasto governado.",
  cardTitle: "Identidade",
  cardDescription: "O nome aparece no topo do produto e nos resumos de governança.",
  lockedTitle: "Por que a moeda está travada?",
  lockedBody: "Orçamentos e assinaturas já denominados nessa moeda preservam a leitura histórica. Para alterar a moeda, remova primeiro esses registros e configure-os novamente.",
  budgets: "Revisar orçamentos",
  subscriptions: "Revisar assinaturas",
};

type TenantRow = { name: string; display_currency: string };

export default async function CompanySettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: tenantData }, { data: userData }, { count: budgetCount }, { count: subscriptionCount }] = await Promise.all([
    supabase.from("tenant").select("name, display_currency").maybeSingle(),
    user ? supabase.from("app_user").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("budget").select("id", { count: "exact", head: true }),
    supabase.from("subscription").select("id", { count: "exact", head: true }),
  ]);
  const tenant = tenantData as TenantRow | null;
  if (!tenant) redirect("/onboarding");
  const role = (userData as { role: string } | null)?.role ?? "viewer";
  const isAdmin = canEditCompanySettings(role);
  const currencyEditable = isAdmin && (budgetCount ?? 0) === 0 && (subscriptionCount ?? 0) === 0;

  return (
    <PageContainer variant="form" className="gap-6">
      <PageHeader title={copy.title} description={copy.subtitle} backHref="/ajustes" backLabel={copy.back} />
      <Card>
        <CardHeader>
          <CardTitle>{copy.cardTitle}</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <CompanyForm companyName={tenant.name} isAdmin={isAdmin} />
          <Separator />
          <CurrencyForm currency={tenant.display_currency} editable={currencyEditable} />
        </CardContent>
      </Card>
      {!currencyEditable && (
        <Alert>
          <IconInfoCircle />
          <AlertTitle>{copy.lockedTitle}</AlertTitle>
          <AlertDescription>
            <p>{copy.lockedBody}</p>
            <p className="mt-2 flex flex-wrap gap-3">
              <Link href="/ajustes/orcamentos" className="font-medium underline underline-offset-4">{copy.budgets}</Link>
              <Link href="/ajustes/assinaturas" className="font-medium underline underline-offset-4">{copy.subscriptions}</Link>
            </p>
          </AlertDescription>
        </Alert>
      )}
    </PageContainer>
  );
}
