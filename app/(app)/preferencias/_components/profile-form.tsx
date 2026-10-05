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
  hint: "É assim que a equipe vê você dentro do Denarius.",
  save: "Salvar nome",
  saving: "Salvando…",
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
    <form action={formAction} className="flex flex-col gap-1.5">
      <Label htmlFor="displayName">{copy.name}</Label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="displayName"
          name="displayName"
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-describedby="display-name-description"
          className="h-9 sm:max-w-sm"
        />
        <Button
          type="submit"
          loading={pending}
          loadingText={copy.saving}
          disabled={!changed || pending}
          className="w-full sm:w-auto"
        >
          {copy.save}
        </Button>
      </div>
      <p
        id="display-name-description"
        className="text-xs/relaxed text-muted-foreground"
      >
        {copy.hint}
      </p>

      <ActionToast
        id="profile-preference"
        state={state}
        success={state.success}
        error={state.error}
      />
    </form>
  );
}
