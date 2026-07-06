"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  updateDigestPreference,
  type SettingsFormState,
} from "@/lib/settings/actions";

const copy = {
  label: "Receber o resumo semanal por e-mail",
  hint: "Enviado às sextas para administradores. Alertas de orçamento não são afetados.",
  save: "Salvar preferência",
  saving: "Salvando...",
};

const initialState: SettingsFormState = {};

export function DigestForm({ receiveDigest }: { receiveDigest: boolean }) {
  const [state, formAction, pending] = useActionState(
    updateDigestPreference,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <input
          id="receiveDigest"
          name="receiveDigest"
          type="checkbox"
          defaultChecked={receiveDigest}
          className="mt-1 size-4 accent-primary"
        />
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="receiveDigest">{copy.label}</Label>
          <p className="text-sm text-muted-foreground">{copy.hint}</p>
        </div>
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
