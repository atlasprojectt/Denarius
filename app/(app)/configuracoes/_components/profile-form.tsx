"use client";

import { useActionState } from "react";

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
      <div className="flex flex-col gap-1.5">
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

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? copy.saving : copy.save}
        </Button>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="text-sm font-medium text-green-700">
            {state.success}
          </p>
        )}
      </div>
    </form>
  );
}
