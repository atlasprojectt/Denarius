import { redirect } from "next/navigation";
import {
  IconBell,
  IconBrush,
  IconUserCircle,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/domain/page-header";
import { PageContainer } from "@/components/domain/page-container";
import { ThemePicker } from "@/components/domain/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { profileInitials, profileLabel } from "@/lib/settings/account";
import { createClient } from "@/lib/supabase/server";
import { DigestForm } from "./_components/digest-form";
import { ProfileForm } from "./_components/profile-form";

const copy = {
  title: "Configurações",
  subtitle: "Perfil, aparência e preferências locais deste navegador.",
  profileTitle: "Seu perfil",
  profileSub: "Este nome aparece dentro do Denarius. O e-mail vem do login.",
  email: "E-mail",
  roleLabel: {
    admin: "Administrador",
    viewer: "Visualizador",
  } as Record<string, string>,
  appearanceTitle: "Aparência",
  appearanceSub:
    "Claro ou escuro fica salvo neste navegador. Não altera dados da empresa.",
  notificationsTitle: "Notificações",
  notificationsSub:
    "O resumo semanal chega por e-mail às sextas, com os números do período.",
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

  return (
    <PageContainer variant="form" className="gap-6">
      <PageHeader title={copy.title} description={copy.subtitle} />

      <Card>
        <CardContent className="p-0">
          <ItemGroup className="gap-0">
            <Item className="rounded-none border-0 px-5 py-5">
              <Avatar size="lg" className="size-16">
                <AvatarFallback className="text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <ItemContent>
                <ItemTitle className="text-base">
                  <IconUserCircle
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                  {displayName}
                </ItemTitle>
                <ItemDescription>
                  {copy.profileSub} {copy.email}: {account.email}
                </ItemDescription>
              </ItemContent>

              <ItemActions className="self-start">
                <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium">
                  {copy.roleLabel[account.role] ?? account.role}
                </span>
              </ItemActions>

              <ItemFooter className="mt-4">
                <div className="w-full rounded-xl border bg-muted/30 p-4">
                  <ProfileForm displayName={displayName} />
                </div>
              </ItemFooter>
            </Item>

            <div className="border-t" />

            <Item className="rounded-none border-0 px-5 py-5">
              <ItemMedia
                variant="icon"
                className="size-8 text-muted-foreground"
              >
                <IconBrush className="size-4" aria-hidden />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{copy.appearanceTitle}</ItemTitle>
                <ItemDescription>{copy.appearanceSub}</ItemDescription>
              </ItemContent>
              <ItemFooter className="mt-4">
                <ThemePicker />
              </ItemFooter>
            </Item>

            {account.role === "admin" && (
              <>
                <div className="border-t" />
                <Item className="rounded-none border-0 px-5 py-5">
                  <ItemMedia
                    variant="icon"
                    className="size-8 text-muted-foreground"
                  >
                    <IconBell className="size-4" aria-hidden />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{copy.notificationsTitle}</ItemTitle>
                    <ItemDescription>{copy.notificationsSub}</ItemDescription>
                  </ItemContent>
                  <ItemFooter className="mt-4">
                    <DigestForm receiveDigest={!account.digest_opt_out} />
                  </ItemFooter>
                </Item>
              </>
            )}
          </ItemGroup>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
