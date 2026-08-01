import { redirect } from "next/navigation";
import { RiAdminLine, RiUserLine } from "@remixicon/react";

import { PageHeader } from "@/components/domain/page-header";
import { PageContainer } from "@/components/domain/page-container";
import { StateBadge } from "@/components/domain/state-badge";
import { ThemePicker } from "@/components/domain/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { profileInitials, profileLabel } from "@/lib/settings/account";
import { createClient } from "@/lib/supabase/server";
import { DigestForm } from "./_components/digest-form";
import { PreferenceSection } from "./_components/preference-section";
import { ProfileForm } from "./_components/profile-form";

const copy = {
  title: "Preferências",
  subtitle: "Gerencie seu perfil, aparência e preferências de comunicação.",
  profileTitle: "Perfil",
  profileSub: "Informações usadas para identificar você dentro do Denarius.",
  roleLabel: {
    admin: "Administrador",
    viewer: "Visualizador",
  } as Record<string, string>,
  appearanceTitle: "Aparência",
  appearanceSub:
    "O tema é salvo neste navegador e não altera as preferências da empresa.",
  notificationsTitle: "Notificações",
  notificationsSub:
    "Escolha quais comunicações deseja receber por e-mail.",
};

type AccountRow = {
  email: string;
  role: string;
  display_name: string | null;
  digest_opt_out: boolean;
  tenant: { id: string } | null;
};

export default async function PersonalSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("app_user")
    .select("email, role, display_name, digest_opt_out, tenant:tenant_id(id)")
    .eq("id", user.id)
    .maybeSingle();

  const account = data as AccountRow | null;
  if (!account?.tenant) redirect("/onboarding");

  const displayName = profileLabel({
    displayName: account.display_name,
    email: account.email,
  });
  const initials = profileInitials({
    displayName: account.display_name,
    email: account.email,
  });
  const RoleIcon = account.role === "admin" ? RiAdminLine : RiUserLine;

  return (
    <PageContainer variant="form" className="gap-6">
      <PageHeader title={copy.title} description={copy.subtitle} />

      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          <PreferenceSection
            id="profile-preferences-title"
            title={copy.profileTitle}
            description={copy.profileSub}
          >
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <Avatar size="lg" className="size-14 sm:size-16">
                  <AvatarFallback className="text-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{displayName}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {account.email}
                  </p>
                </div>

                <StateBadge icon={RoleIcon} className="self-start sm:self-center">
                  {copy.roleLabel[account.role] ?? account.role}
                </StateBadge>
              </div>

              <ProfileForm displayName={displayName} />
            </div>
          </PreferenceSection>

          <Separator />

          <PreferenceSection
            id="appearance-preferences-title"
            title={copy.appearanceTitle}
            description={copy.appearanceSub}
          >
            <ThemePicker />
          </PreferenceSection>

          {account.role === "admin" && (
            <>
              <Separator />
              <PreferenceSection
                id="notification-preferences-title"
                title={copy.notificationsTitle}
                description={copy.notificationsSub}
              >
                <DigestForm receiveDigest={!account.digest_opt_out} />
              </PreferenceSection>
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
