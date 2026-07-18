"use client";

import { useActionState } from "react";
import { RiShieldCheckLine } from "@remixicon/react";

import { ActionStatus } from "@/components/domain/action-status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  updatePrivacySettings,
  type SettingsFormState,
} from "@/lib/settings/actions";

const copy = {
  names: "Mostrar nomes individuais",
  namesHint:
    "Com isto desligado, ninguém vê nomes — nem Admins. Visualizadores nunca veem nomes.",
  store: "Armazenar dados por pessoa",
  storeHint:
    "Desligado, a sincronização guarda só agregados por time — os totais continuam exatos.",
  neverStored:
    "Prompts e respostas nunca são armazenados — somente metadados de uso (tokens, modelos, datas).",
  save: "Salvar privacidade",
  saving: "Salvando…",
  adminOnly: "Somente administradores podem alterar a privacidade.",
};

const initialState: SettingsFormState = {};

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={name}>{label}</Label>
        <p className="text-sm/relaxed text-muted-foreground">{hint}</p>
      </div>
      <Switch
        id={name}
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
      />
    </div>
  );
}

export function PrivacyForm({
  showNames,
  storePerPerson,
  isAdmin,
}: {
  showNames: boolean;
  storePerPerson: boolean;
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updatePrivacySettings,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Toggle
        name="showNames"
        label={copy.names}
        hint={copy.namesHint}
        defaultChecked={showNames}
        disabled={!isAdmin}
      />
      <Toggle
        name="storePerPerson"
        label={copy.store}
        hint={copy.storeHint}
        defaultChecked={storePerPerson}
        disabled={!isAdmin}
      />

      <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs/relaxed text-muted-foreground">
        <RiShieldCheckLine className="mt-0.5 size-4 shrink-0" aria-hidden />
        {copy.neverStored}
      </p>

      {isAdmin ? (
        <div className="flex items-center gap-3">
          <Button type="submit" loading={pending} loadingText={copy.saving}>
            {copy.save}
          </Button>
          <ActionStatus error={state.error} success={state.success} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{copy.adminOnly}</p>
      )}
    </form>
  );
}
