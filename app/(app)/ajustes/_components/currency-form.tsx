"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  updateDisplayCurrency,
  type SettingsFormState,
} from "@/lib/settings/actions";

const copy = {
  label: "Moeda de exibição",
  editableNote:
    "Pode ser alterada agora porque ainda não há orçamentos nem assinaturas denominados nela.",
  lockedNote:
    "A moeda fica travada porque já há orçamentos ou assinaturas denominados nela (câmbio congelado).",
  save: "Salvar moeda",
  saving: "Salvando...",
};

const CURRENCIES = ["BRL", "USD", "EUR", "GBP"] as const;

const initialState: SettingsFormState = {};

export function CurrencyForm({
  currency,
  editable,
}: {
  currency: string;
  editable: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateDisplayCurrency,
    initialState,
  );

  if (!editable) {
    return (
      <div className="rounded-lg border p-3 text-sm">
        <p className="text-muted-foreground">{copy.label}</p>
        <p className="mt-1 font-medium tabular-nums">{currency}</p>
        <p className="mt-1 text-xs text-muted-foreground">{copy.lockedNote}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="currency" className="text-sm font-medium">
          {copy.label}
        </label>
        <select
          id="currency"
          name="currency"
          defaultValue={currency}
          className="w-40 rounded-md border bg-transparent px-3 py-1.5 text-sm"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{copy.editableNote}</p>
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
