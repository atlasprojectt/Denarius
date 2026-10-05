"use client";

import { Camera01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";

import { Spokes } from "@/components/loading-ui/spokes";
import { ActionToast } from "@/components/domain/toast-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PROFILE_AVATAR_MIME_TYPES } from "@/lib/settings/avatar";
import {
  updateProfileAvatar,
  type SettingsFormState,
} from "@/lib/settings/actions";
import { profileAvatarSchema } from "@/lib/validation";

const copy = {
  change: "Trocar foto de perfil",
  overlay: "Trocar",
  uploading: "Enviando foto…",
};

const initialState: SettingsFormState = {};

/**
 * The avatar is its own control: hovering (or focusing) it reveals a camera
 * overlay, a click opens the file picker and choosing a file uploads it right
 * away. Touch screens have no hover, so they get a permanent camera badge.
 */
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
  // A fresh object per rejection, so the same message toasts again.
  const [rejected, setRejected] = useState<{ error: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.error) setPreviewUrl(avatarUrl);
  }

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
    const file = event.target.files?.[0];
    if (!file) return;

    // The server validates again; checking here first keeps an oversized file
    // from ever reaching the action's body limit.
    const parsed = profileAvatarSchema.safeParse({ avatar: file });
    if (!parsed.success) {
      event.target.value = "";
      setRejected({ error: parsed.error.issues[0]?.message ?? "" });
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction} className="shrink-0">
      <input
        ref={inputRef}
        type="file"
        name="avatar"
        accept={PROFILE_AVATAR_MIME_TYPES.join(",")}
        onChange={handleFileChange}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        aria-label={pending ? copy.uploading : copy.change}
        title={copy.change}
        className="group/avatar-picker relative block size-20 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-progress"
      >
        <Avatar className="size-20">
          {previewUrl && <AvatarImage src={previewUrl} alt="" />}
          <AvatarFallback className="text-xl font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          aria-hidden
          data-pending={pending || undefined}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/60 text-white opacity-0 backdrop-blur-[2px] transition-opacity duration-(--motion-duration-fast) ease-(--motion-ease-standard) group-hover/avatar-picker:opacity-100 group-focus-visible/avatar-picker:opacity-100 data-pending:opacity-100"
        >
          {pending ? (
            <Spokes className="size-5" />
          ) : (
            <>
              <HugeiconsIcon icon={Camera01Icon} className="size-5" />
              <span className="text-2xs font-medium">{copy.overlay}</span>
            </>
          )}
        </span>
        <span
          aria-hidden
          className="absolute right-0 bottom-0 z-20 flex size-7 items-center justify-center rounded-full border-2 border-card bg-foreground text-background pointer-fine:hidden"
        >
          <HugeiconsIcon icon={Camera01Icon} className="size-3.5" />
        </span>
      </button>

      <ActionToast
        id="profile-avatar"
        state={state}
        success={state.success}
        error={state.error}
      />
      {rejected && (
        <ActionToast
          id="profile-avatar-rejected"
          state={rejected}
          error={rejected.error}
        />
      )}
    </form>
  );
}
