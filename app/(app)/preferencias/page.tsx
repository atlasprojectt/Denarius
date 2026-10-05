import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LockPasswordIcon,
  Notification01Icon,
  PaintBoardIcon,
} from "@hugeicons/core-free-icons";

import { PageHeader } from "@/components/domain/page-header";
import { PageContainer } from "@/components/domain/page-container";
import { ThemePicker } from "@/components/domain/theme-toggle";
import { Button } from "@/components/ui/button";
import { hasPasswordIdentity } from "@/lib/auth/password";
import { profileInitials, profileLabel } from "@/lib/settings/account";
import { isMissingProfileAvatarColumn } from "@/lib/settings/avatar-schema";
import { profileAvatarUrl } from "@/lib/settings/avatar-url";
import { createClient } from "@/lib/supabase/server";
import { DigestForm } from "./_components/digest-form";
import { PasswordForm } from "./_components/password-form";
import { PreferenceCard } from "./_components/preference-card";
import { ProfileCard } from "./_components/profile-card";

const copy = {
  title: "Preferências",
  subtitle:
    "Controle sua identidade, segurança e a forma como o Denarius funciona para você.",
  passwordTitle: "Segurança e acesso",
  passwordSub: "Como você entra e protege sua conta no Denarius.",
  passwordRow: "Senha",
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

  return (
    <PageContainer variant="form" className="gap-5">
      <PageHeader title={copy.title} description={copy.subtitle} />

      <ProfileCard
        displayName={displayName}
        email={account.email}
        initials={initials}
        avatarUrl={avatarUrl}
        avatarPath={account.avatar_path ?? null}
        avatarEditable={avatarColumnAvailable}
        companyName={account.tenant.name}
        role={account.role}
      />

      <PreferenceCard
        id="password-preferences-title"
        icon={LockPasswordIcon}
        title={copy.passwordTitle}
        description={copy.passwordSub}
      >
        {/* A Google account has no password here to change — say so
            instead of offering a flow that could only fail (#69). */}
        {hasPasswordIdentity(user) ? (
          // The code goes to the Auth address, so that is the one to name.
          <PasswordForm email={user.email ?? account.email} />
        ) : (
          <div>
            <p className="text-ui font-medium">{copy.passwordRow}</p>
            <p className="mt-0.5 text-xs/relaxed text-muted-foreground">
              {copy.passwordGoogle}
            </p>
          </div>
        )}
      </PreferenceCard>

      <PreferenceCard
        id="appearance-preferences-title"
        icon={PaintBoardIcon}
        title={copy.appearanceTitle}
        description={copy.appearanceSub}
      >
        <ThemePicker />
      </PreferenceCard>

      {account.role === "admin" && (
        <PreferenceCard
          id="notification-preferences-title"
          icon={Notification01Icon}
          title={copy.notificationsTitle}
          description={copy.notificationsSub}
        >
          <DigestForm receiveDigest={!account.digest_opt_out} />
        </PreferenceCard>
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
