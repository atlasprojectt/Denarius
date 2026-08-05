import { redirect } from "next/navigation";

import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { currentRole } from "@/lib/auth/session";
import { listPendingInvitations } from "@/lib/invitations/queries";
import { canEditCompanySettings } from "@/lib/settings/account";
import { createClient } from "@/lib/supabase/server";
import { UsersTable, type TenantUser } from "../_components/users-table";
import { InviteForm } from "./_components/invite-form";
import { PendingInvitations } from "./_components/pending-invitations";

const copy = {
  back: "Ajustes",
  title: "Usuários",
  subtitle: "Quem tem acesso a este espaço e qual papel cada pessoa ocupa.",
  inviteTitle: "Convidar pessoa",
  inviteDescription:
    "O convite vale por 7 dias e dá acesso apenas a este espaço, no papel escolhido.",
  cardTitle: "Acesso ao Denarius",
  cardDescription: "Remover um usuário revoga o acesso imediatamente.",
};

export default async function UsersSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [role, { data: usersData }, invitations] = await Promise.all([
    currentRole(),
    supabase.from("app_user").select("id, email, role").order("email"),
    listPendingInvitations(),
  ]);
  const isAdmin = canEditCompanySettings(role ?? "viewer");

  return (
    <PageContainer variant="settings" className="gap-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        backHref="/ajustes"
        backLabel={copy.back}
      />

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>{copy.inviteTitle}</CardTitle>
            <CardDescription>{copy.inviteDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{copy.cardTitle}</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <UsersTable users={(usersData ?? []) as TenantUser[]} currentUserId={user.id} isAdmin={isAdmin} />
          <PendingInvitations invitations={invitations} isAdmin={isAdmin} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
