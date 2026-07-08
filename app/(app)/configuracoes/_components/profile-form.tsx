"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/domain/action-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateProfileName,
  type SettingsFormState,
} from "@/lib/settings/actions";

const copy = {
  name: "Nome",
  save: "Salvar perfil",
  saving: "Salvando...",
};

const initialState: SettingsFormState = {};

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState(
    updateProfileName,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="displayName">{copy.name}</Label>
          <Input
            id="displayName"
            name="displayName"
            required
            minLength={2}
            maxLength={80}
            defaultValue={displayName}
          />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? copy.saving : copy.save}
        </Button>
      </div>

      {(state.error || state.success) && (
        <div className="flex items-center gap-3">
          <ActionStatus error={state.error} success={state.success} />
        </div>
      )}
    </form>
  );
}
