"use client";

import { useActionState } from "react";
import { RiLockLine } from "@remixicon/react";

import { ActionStatus } from "@/components/domain/action-status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateDisplayCurrency,
  type SettingsFormState,
} from "@/lib/settings/actions";

const copy = {
  label: "Moeda de exibição",
  editableNote:
    "Pode ser alterada agora porque ainda não há orçamentos nem assinaturas denominados nela.",
  lockedNote:
    "Travada: já há orçamentos ou assinaturas denominados nela (câmbio congelado).",
  save: "Salvar",
  saving: "Salvando…",
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
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium">{copy.label}</p>
        <p className="flex items-center gap-1.5 text-sm tabular-nums">
          {currency}
          <RiLockLine className="size-3.5 text-muted-foreground" aria-hidden />
        </p>
        <p className="text-xs/relaxed text-muted-foreground">{copy.lockedNote}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currency">{copy.label}</Label>
        <Select name="currency" defaultValue={currency}>
          <SelectTrigger id="currency" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs/relaxed text-muted-foreground">
          {copy.editableNote}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? copy.saving : copy.save}
        </Button>
        <ActionStatus error={state.error} success={state.success} />
      </div>
    </form>
  );
}
