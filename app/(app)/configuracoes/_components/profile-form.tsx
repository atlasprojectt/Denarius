"use client";

import { useActionState, useState } from "react";

import { ActionToast } from "@/components/domain/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateProfileName,
  type SettingsFormState,
} from "@/lib/settings/actions";

const copy = {
  name: "Nome de exibição",
  hint: "Este nome será exibido dentro do Denarius.",
  emailNote: "O e-mail é definido pela sua conta de acesso.",
  save: "Salvar perfil",
  saving: "Salvando...",
};

const initialState: SettingsFormState = {};

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState(
    updateProfileName,
    initialState,
  );
  const [name, setName] = useState(displayName);

  const changed = name.trim() !== displayName.trim();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="displayName">{copy.name}</Label>
          <Input
            id="displayName"
            name="displayName"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-describedby="display-name-description account-email-note"
            className="h-10"
          />
          <p
            id="display-name-description"
            className="text-xs/relaxed text-muted-foreground"
          >
            {copy.hint}
          </p>
          <p
            id="account-email-note"
            className="text-xs/relaxed text-muted-foreground"
          >
            {copy.emailNote}
          </p>
        </div>
        <Button
          type="submit"
          loading={pending}
          loadingText={copy.saving}
          disabled={!changed || pending}
          className="w-full md:w-auto"
        >
          {copy.save}
        </Button>
      </div>

      <ActionToast
        id="profile-preference"
        state={state}
        success={state.success}
        error={state.error}
      />
    </form>
  );
}
