import {
  Building06Icon,
  ShieldUserIcon,
  UserCircleIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";

import { StateBadge } from "@/components/domain/state-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PreferenceCard } from "./preference-card";
import { ProfileAvatarForm } from "./profile-avatar-form";
import { ProfileForm } from "./profile-form";

const copy = {
  title: "Perfil",
  description: "Sua foto e o nome com que a equipe vê você no Denarius.",
  photoHint: "Clique na foto para trocá-la · JPG, PNG ou WebP, até 3 MB.",
  roleLabel: {
    admin: "Administrador",
    viewer: "Visualizador",
  } as Record<string, string>,
};

export function ProfileCard({
  displayName,
  email,
  initials,
  avatarUrl,
  avatarPath,
  avatarEditable,
  companyName,
  role,
}: {
  displayName: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
  /** Remounts the picker once a new upload lands, so it drops its preview. */
  avatarPath: string | null;
  avatarEditable: boolean;
  companyName: string;
  role: string;
}) {
  const RoleIcon = role === "admin" ? ShieldUserIcon : UserIcon;

  return (
    <PreferenceCard
      id="profile-preferences-title"
      icon={UserCircleIcon}
      title={copy.title}
      description={copy.description}
    >
      <div className="flex items-center gap-4 sm:gap-5">
        {avatarEditable ? (
          <ProfileAvatarForm
            key={avatarPath ?? "no-avatar"}
            initials={initials}
            avatarUrl={avatarUrl}
          />
        ) : (
          <Avatar className="size-20 shrink-0">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback className="text-xl font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-medium">{displayName}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {email}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <StateBadge icon={Building06Icon} className="max-w-full">
              <span className="truncate">{companyName}</span>
            </StateBadge>
            <StateBadge icon={RoleIcon}>
              {copy.roleLabel[role] ?? role}
            </StateBadge>
          </div>
          {avatarEditable && (
            <p className="mt-2 text-2xs text-muted-foreground">
              {copy.photoHint}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 border-t pt-5">
        <ProfileForm displayName={displayName} />
      </div>
    </PreferenceCard>
  );
}
