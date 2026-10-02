"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";

import { ActionToast } from "@/components/domain/toast-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateProfileAvatar,
  type SettingsFormState,
} from "@/lib/settings/actions";

const copy = {
  label: "Foto de perfil",
  hint: "JPG, PNG ou WebP · até 3 MB.",
  choose: "Arquivo da foto de perfil",
  save: "Atualizar foto",
  saving: "Enviando…",
};

const initialState: SettingsFormState = {};

export function ProfileAvatarForm({
  initials,
  avatarUrl,
}: {
  initials: string;
  avatarUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAvatar,
    initialState,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
  }, [router, state.success]);

  useEffect(
    () => () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : avatarUrl);
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar size="lg" className="size-12">
            {previewUrl && <AvatarImage src={previewUrl} alt="" />}
            <AvatarFallback className="text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Label htmlFor="profile-avatar" className="text-sm font-medium">
              {copy.label}
            </Label>
            <p className="mt-0.5 text-xs/relaxed text-muted-foreground">
              {copy.hint}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <Input
            ref={inputRef}
            id="profile-avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            aria-label={copy.choose}
            className="h-10 max-w-full sm:w-64"
          />
          <Button
            type="submit"
            loading={pending}
            loadingText={copy.saving}
            disabled={!selectedFile || pending}
            className="w-full sm:w-auto"
          >
            {copy.save}
          </Button>
        </div>
      </div>

      <ActionToast
        id="profile-avatar"
        state={state}
        success={state.success}
        error={state.error}
      />
    </form>
  );
}
