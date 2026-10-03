import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldUserIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";

import { PageHeader } from "@/components/domain/page-header";
import { PageContainer } from "@/components/domain/page-container";
import { StateBadge } from "@/components/domain/state-badge";
import { ThemePicker } from "@/components/domain/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasPasswordIdentity } from "@/lib/auth/password";
import { profileInitials, profileLabel } from "@/lib/settings/account";
import { isMissingProfileAvatarColumn } from "@/lib/settings/avatar-schema";
import { profileAvatarUrl } from "@/lib/settings/avatar-url";
import { createClient } from "@/lib/supabase/server";
import { DigestForm } from "./_components/digest-form";
import { PasswordForm } from "./_components/password-form";
import { PreferenceSection } from "./_components/preference-section";
import { ProfileAvatarForm } from "./_components/profile-avatar-form";
import { ProfileForm } from "./_components/profile-form";

const copy = {
  title: "Preferências",
  subtitle:
    "Controle sua identidade, segurança e a forma como o Denarius funciona para você.",
  profileTitle: "Perfil",
  profileSub: "Atualize como você é identificado e veja o contexto da sua conta.",
  accountContext: "Contexto da conta",
  companyLabel: "Empresa",
  accessLabel: "Acesso",
  roleLabel: {
    admin: "Administrador",
    viewer: "Visualizador",
  } as Record<string, string>,
  passwordTitle: "Segurança e acesso",
  passwordSub: "Como você entra e protege sua conta no Denarius.",
  passwordGoogle:
    "Você entra pela sua conta Google, então não existe senha do Denarius para trocar — a senha e a verificação em duas etapas ficam com o Google.",
  appearanceTitle: "Aparência",
  appearanceSub:
    "O tema é salvo neste navegador e não altera as preferências da empresa.",
  notificationsTitle: "Notificações",
  notificationsSub: "Escolha quais comunicações você deseja receber por e-mail.",
  legalNavLabel: "Documentos legais",
  privacyPolicy: "Privacidade",
  terms: "Termos",
};

type AccountRow = {
  email: string;
  role: string;
  display_name: string | null;
  avatar_path?: string | null;
  digest_opt_out: boolean;
  tenant: { id: string; name: string } | null;
};

export default async function PersonalSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profileResult = await supabase
    .from("app_user")
    .select("email, role, display_name, avatar_path, digest_opt_out, tenant:tenant_id(id, name)")
    .eq("id", user.id)
    .maybeSingle();

  let accountData = profileResult.data;
  const avatarColumnAvailable = !isMissingProfileAvatarColumn(
    profileResult.error,
  );
  if (!avatarColumnAvailable) {
    const fallback = await supabase
      .from("app_user")
      .select("email, role, display_name, digest_opt_out, tenant:tenant_id(id, name)")
      .eq("id", user.id)
      .maybeSingle();
    accountData = fallback.data
      ? { ...fallback.data, avatar_path: null }
      : null;
  }

  const account = accountData as AccountRow | null;
  if (!account?.tenant) redirect("/onboarding");

  const displayName = profileLabel({
    displayName: account.display_name,
    email: account.email,
  });
  const initials = profileInitials({
    displayName: account.display_name,
    email: account.email,
  });
  const avatarUrl = await profileAvatarUrl(
    supabase,
    account.avatar_path ?? null,
  );
  const RoleIcon = account.role === "admin" ? ShieldUserIcon : UserIcon;

  return (
    <PageContainer variant="form" className="gap-6">
      <PageHeader title={copy.title} description={copy.subtitle} />

      <Card>
        <CardContent className="p-0">
          <PreferenceSection
            id="profile-preferences-title"
            title={copy.profileTitle}
            description={copy.profileSub}
          >
            <div className="grid gap-6 md:grid-cols-[minmax(180px,0.78fr)_minmax(0,1.22fr)] md:gap-8">
              <div className="rounded-lg border bg-muted/30 p-4 sm:p-5">
                <p className="text-xs font-medium text-muted-foreground">
                  {copy.accountContext}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar size="lg" className="size-14 shrink-0">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                    <AvatarFallback className="text-lg font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{displayName}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {account.email}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 grid gap-3 border-t pt-4 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">{copy.companyLabel}</dt>
                    <dd className="truncate text-right font-medium">{account.tenant.name}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">{copy.accessLabel}</dt>
                    <dd>
                      <StateBadge icon={RoleIcon}>
                        {copy.roleLabel[account.role] ?? account.role}
                      </StateBadge>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex min-w-0 flex-col gap-5">
                <ProfileForm displayName={displayName} />
                {avatarColumnAvailable && (
                  <div className="border-t pt-5">
                    <ProfileAvatarForm
                      key={account.avatar_path ?? "no-avatar"}
                      initials={initials}
                      avatarUrl={avatarUrl}
                    />
                  </div>
                )}
              </div>
            </div>
          </PreferenceSection>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <PreferenceSection
            id="password-preferences-title"
            title={copy.passwordTitle}
            description={copy.passwordSub}
          >
            {/* A Google account has no password here to change — say so
                instead of offering a form that could only fail (#69). */}
            {hasPasswordIdentity(user) ? (
              <PasswordForm />
            ) : (
              <p className="text-xs/relaxed text-muted-foreground">
                {copy.passwordGoogle}
              </p>
            )}
          </PreferenceSection>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <PreferenceSection
            id="appearance-preferences-title"
            title={copy.appearanceTitle}
            description={copy.appearanceSub}
          >
            <ThemePicker />
          </PreferenceSection>
        </CardContent>
      </Card>

      {account.role === "admin" && (
        <Card>
          <CardContent className="p-0">
            <PreferenceSection
              id="notification-preferences-title"
              title={copy.notificationsTitle}
              description={copy.notificationsSub}
            >
              <DigestForm receiveDigest={!account.digest_opt_out} />
            </PreferenceSection>
          </CardContent>
        </Card>
      )}

      <nav
        aria-label={copy.legalNavLabel}
        className="flex items-center justify-center gap-2"
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/privacidade">{copy.privacyPolicy}</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/termos">{copy.terms}</Link>
        </Button>
      </nav>
    </PageContainer>
  );
}
