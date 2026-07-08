"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/domain/action-status";
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
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="scope" value={scope} />
        {teamId !== null && <input type="hidden" name="teamId" value={teamId} />}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`amount-${scope}-${teamId ?? "org"}`}>
            {copy.amount} ({currency})
          </Label>
          <Input
            id={`amount-${scope}-${teamId ?? "org"}`}
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={existing?.amount ?? ""}
            className="w-40 tabular-nums"
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
        <form action={deleteAction}>
          <input type="hidden" name="budgetId" value={existing.id} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={deleting}
            className="-ml-2 text-muted-foreground hover:text-destructive"
          >
            {deleting ? copy.removing : copy.remove}
          </Button>
        </form>
      )}

      <ActionStatus
        error={state.error ?? deleteState.error}
        success={state.success ?? deleteState.success}
      />
    </div>
  );
}
