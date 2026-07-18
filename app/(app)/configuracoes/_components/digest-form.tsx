"use client";

import { useActionState, useState } from "react";

import { ActionToast } from "@/components/domain/toast-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  updateDigestPreference,
  type SettingsFormState,
} from "@/lib/settings/actions";

const copy = {
  label: "Receber resumo semanal por e-mail",
  description:
    "Enviado às sextas-feiras para administradores, com os principais números do período.",
  note: "Alertas de orçamento não são afetados.",
  save: "Salvar notificações",
  saving: "Salvando...",
};

const initialState: SettingsFormState = {};

export function DigestForm({ receiveDigest }: { receiveDigest: boolean }) {
  const [state, formAction, pending] = useActionState(
    updateDigestPreference,
    initialState,
  );
  const [receive, setReceive] = useState(receiveDigest);

  const changed = receive !== receiveDigest;

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <div className="flex min-h-11 items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <Label htmlFor="receiveDigest" className="cursor-pointer text-[13px]">
            {copy.label}
          </Label>
          <p
            id="digest-description"
            className="mt-1 text-xs/relaxed text-muted-foreground"
          >
            {copy.description}
          </p>
          <p
            id="digest-note"
            className="mt-1.5 text-xs/relaxed text-muted-foreground"
          >
            {copy.note}
          </p>
        </div>
        <Switch
          id="receiveDigest"
          name="receiveDigest"
          checked={receive}
          onCheckedChange={setReceive}
          aria-describedby="digest-description digest-note"
          className="mt-0.5"
        />
      </div>

      <div className="flex justify-end">
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
        id="digest-preference"
        state={state}
        success={state.success}
        error={state.error}
      />
    </form>
  );
}
