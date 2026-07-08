"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  updatePrivacySettings,
  type SettingsFormState,
} from "@/lib/settings/actions";

const copy = {
  names: "Mostrar nomes individuais (somente Admin)",
  namesHint:
    "Com isto desligado, ninguém vê nomes — nem Admins. Visualizadores nunca veem nomes.",
  store: "Armazenar dados por pessoa",
  storeHint:
    "Desligado, a sincronização guarda só agregados por time — os totais continuam exatos.",
  neverStored:
    "Prompts e respostas nunca são armazenados — somente metadados de uso (tokens, modelos, datas).",
  save: "Salvar privacidade",
  saving: "Salvando...",
  adminOnly: "Somente administradores podem alterar a privacidade.",
};

const initialState: SettingsFormState = {};

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
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex items-start gap-3">
        <input
          name="showNames"
          type="checkbox"
          defaultChecked={showNames}
          disabled={!isAdmin}
          className="mt-1 size-4 accent-primary"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{copy.names}</span>
          <span className="text-sm text-muted-foreground">{copy.namesHint}</span>
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input
          name="storePerPerson"
          type="checkbox"
          defaultChecked={storePerPerson}
          disabled={!isAdmin}
          className="mt-1 size-4 accent-primary"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{copy.store}</span>
          <span className="text-sm text-muted-foreground">{copy.storeHint}</span>
        </span>
      </label>

      <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        {copy.neverStored}
      </p>

      {isAdmin ? (
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
      ) : (
        <p className="text-sm text-muted-foreground">{copy.adminOnly}</p>
      )}
    </form>
  );
}
