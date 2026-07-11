"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/domain/action-status";
import { ConfirmationDialog } from "@/components/domain/confirmation-dialog";
import { MoneyInput } from "@/components/domain/money-input";
import { ActionToast } from "@/components/domain/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteBudget,
  upsertBudget,
  type BudgetFormState,
} from "@/lib/budgets/actions";

const copy = {
  amount: "Valor do orçamento",
  warn: "Aviso em (%)",
  save: "Salvar",
  saving: "Salvando…",
  create: "Definir orçamento",
  remove: "Remover",
  removing: "Removendo…",
  removeTitle: "Remover orçamento?",
  removeDescription: "O veredito e os avisos deste escopo deixam de ser calculados até que um novo orçamento seja definido.",
};

const initialState: BudgetFormState = {};

export type ExistingBudget = {
  id: string;
  amount: number;
  warnPct: number;
};

/**
 * Create/edit form for one budget (org or one team). `scope`/`teamId` are hidden
 * fields; the server action validates authoritatively. Edit and delete are two
 * independent forms, each with its own action state.
 */
export function BudgetForm({
  scope,
  teamId,
  currency,
  existing,
}: {
  scope: "org" | "team";
  teamId: string | null;
  currency: string;
  existing: ExistingBudget | null;
}) {
  const [state, formAction, pending] = useActionState(
    upsertBudget,
    initialState,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteBudget,
    initialState,
  );

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} noValidate className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="scope" value={scope} />
        {teamId !== null && <input type="hidden" name="teamId" value={teamId} />}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`amount-${scope}-${teamId ?? "org"}`}>
            {copy.amount} ({currency})
          </Label>
          <MoneyInput
            id={`amount-${scope}-${teamId ?? "org"}`}
            name="amount"
            currency={currency}
            defaultValue={existing?.amount ?? ""}
            className="w-48"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`warn-${scope}-${teamId ?? "org"}`}>{copy.warn}</Label>
          <Input
            id={`warn-${scope}-${teamId ?? "org"}`}
            name="warnPct"
            type="number"
            min={50}
            max={99}
            step={1}
            defaultValue={existing?.warnPct ?? 80}
            className="w-24 tabular-nums"
          />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? copy.saving : existing ? copy.save : copy.create}
        </Button>
      </form>

      {existing && (
        <ConfirmationDialog
          trigger={<Button type="button" variant="destructive" size="sm">{copy.remove}</Button>}
          title={copy.removeTitle}
          description={copy.removeDescription}
          confirmLabel={copy.remove}
          pendingLabel={copy.removing}
          action={deleteAction}
          pending={deleting}
          success={deleteState.success}
        >
          <input type="hidden" name="budgetId" value={existing.id} />
        </ConfirmationDialog>
      )}

      <ActionToast id={`budget:${scope}:${teamId ?? "org"}:delete`} error={deleteState.error} success={deleteState.success} />

      <ActionStatus
        error={state.error}
        success={state.success}
      />
    </div>
  );
}
