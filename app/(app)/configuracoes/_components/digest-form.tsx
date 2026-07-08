"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/domain/action-status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex w-full items-start justify-between gap-4 rounded-xl border bg-muted/30 p-4">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="receiveDigest">{copy.label}</Label>
          <p className="text-sm/relaxed text-muted-foreground">{copy.hint}</p>
        </div>
        <Switch
          id="receiveDigest"
          name="receiveDigest"
          defaultChecked={receiveDigest}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? copy.saving : copy.save}
        </Button>
        <ActionStatus error={state.error} success={state.success} />
      </div>
    </form>
  );
}
