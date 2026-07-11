import { redirect } from "next/navigation";

import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canEditCompanySettings } from "@/lib/settings/account";
import { createClient } from "@/lib/supabase/server";
import { UsersTable, type TenantUser } from "../_components/users-table";

const copy = {
  back: "Ajustes",
  title: "Usuários",
  subtitle: "Quem tem acesso a este espaço e qual papel cada pessoa ocupa.",
  inviteSoon: "Convidar — em breve",
  cardTitle: "Acesso ao Denarius",
  cardDescription: "Remover um usuário revoga o acesso imediatamente.",
};

export default async function UsersSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: appUserData }, { data: usersData }] = await Promise.all([
    supabase.from("app_user").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("app_user").select("id, email, role").order("email"),
  ]);
  const isAdmin = canEditCompanySettings((appUserData as { role: string } | null)?.role ?? "viewer");

  return (
    <PageContainer className="gap-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        backHref="/ajustes"
        backLabel={copy.back}
        actions={<Button disabled>{copy.inviteSoon}</Button>}
      />
      <Card>
        <CardHeader>
          <CardTitle>{copy.cardTitle}</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable users={(usersData ?? []) as TenantUser[]} currentUserId={user.id} isAdmin={isAdmin} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
