import { redirect } from "next/navigation";

import { PageHeader } from "@/components/domain/page-header";
import { ThemeToggle } from "@/components/domain/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { profileInitials, profileLabel } from "@/lib/settings/account";
import { createClient } from "@/lib/supabase/server";
import { DigestForm } from "./_components/digest-form";
import { ProfileForm } from "./_components/profile-form";

const copy = {
  title: "Configurações",
  subtitle:
    "Perfil, aparência e preferências locais deste navegador.",
  profileTitle: "Seu perfil",
  profileSub: "Este nome aparece dentro do Denarius. O e-mail vem do login.",
  email: "E-mail",
  role: "Função",
  roleLabel: {
    admin: "Administrador",
    viewer: "Visualizador",
  } as Record<string, string>,
  appearanceTitle: "Aparência",
  appearanceSub:
    "Claro ou escuro fica salvo neste navegador. Não altera dados da empresa.",
  theme: "Tema",
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader title={copy.title} description={copy.subtitle} />

      <Card>
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar size="lg" className="size-14">
            <AvatarFallback className="text-base font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold">{copy.profileTitle}</h2>
              <p className="mt-1 text-sm/relaxed text-muted-foreground">
                {copy.profileSub}
              </p>
            </div>

            <ProfileForm displayName={displayName} />

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">{copy.email}</dt>
                <dd className="mt-1 font-medium">{account.email}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">{copy.role}</dt>
                <dd className="mt-1 font-medium">
                  {copy.roleLabel[account.role] ?? account.role}
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      {account.role === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{copy.notificationsTitle}</CardTitle>
            <CardDescription>{copy.notificationsSub}</CardDescription>
          </CardHeader>
          <CardContent>
            <DigestForm receiveDigest={!account.digest_opt_out} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{copy.appearanceTitle}</CardTitle>
          <CardDescription>{copy.appearanceSub}</CardDescription>
          <CardAction className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{copy.theme}</span>
            <ThemeToggle />
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}
