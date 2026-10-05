"use client";

import { startTransition, useActionState, useState } from "react";

import { ActionToast } from "@/components/domain/toast-provider";
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
};

const initialState: SettingsFormState = {};

/** A switch takes effect when flipped — no separate save step. A refused save
 *  snaps the switch back to what the server holds. */
export function DigestForm({ receiveDigest }: { receiveDigest: boolean }) {
  const [state, formAction, pending] = useActionState(
    updateDigestPreference,
    initialState,
  );
  const [receive, setReceive] = useState(receiveDigest);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.error) setReceive(receiveDigest);
  }

  function handleChange(checked: boolean) {
    setReceive(checked);
    const formData = new FormData();
    if (checked) formData.set("receiveDigest", "on");
    startTransition(() => formAction(formData));
  }

  return (
    <div className="flex items-start justify-between gap-5">
      <div className="min-w-0 flex-1">
        <Label htmlFor="receiveDigest" className="cursor-pointer text-ui">
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
        checked={receive}
        onCheckedChange={handleChange}
        disabled={pending}
        aria-busy={pending || undefined}
        aria-describedby="digest-description digest-note"
        className="mt-0.5"
      />

      <ActionToast
        id="digest-preference"
        state={state}
        success={state.success}
        error={state.error}
      />
    </div>
  );
}
