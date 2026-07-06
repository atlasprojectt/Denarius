import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/domain/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar size="lg" className="size-14">
            <AvatarFallback className="text-base font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <h2 className="font-semibold">{copy.profileTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy.profileSub}
              </p>
            </div>

            <ProfileForm displayName={displayName} />

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground">{copy.email}</dt>
                <dd className="mt-1 font-medium">{account.email}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground">{copy.role}</dt>
                <dd className="mt-1 font-medium">
                  {copy.roleLabel[account.role] ?? account.role}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {account.role === "admin" && (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-semibold">{copy.notificationsTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy.notificationsSub}
              </p>
            </div>
            <DigestForm receiveDigest={!account.digest_opt_out} />
          </div>
        </section>
      )}

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">{copy.appearanceTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.appearanceSub}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{copy.theme}</span>
            <ThemeToggle />
          </div>
        </div>
      </section>
    </div>
  );
}
