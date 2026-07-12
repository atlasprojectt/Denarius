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
  saveBudgetsBatch,
  type BudgetBatchState,
  type BudgetFormState,
} from "@/lib/budgets/actions";

const copy = {
  scope: "Escopo",
  amount: "Orçamento",
  warn: "Aviso em (%)",
  warnHelp: "O aviso aparece quando o consumo cruza este percentual do limite.",
  actions: "Ações",
  save: "Salvar alterações",
  saving: "Salvando…",
  remove: "Remover",
  removing: "Removendo…",
  removeTitle: (label: string) => `Remover orçamento de ${label}?`,
  removeDescription: "O veredito e os avisos deste escopo deixam de ser calculados até que um novo orçamento seja definido.",
};

const batchInitial: BudgetBatchState = {};
const deleteInitial: BudgetFormState = {};
const FORM_ID = "budget-batch-form";

export type BudgetTableRow = {
  key: string;
  label: string;
  existing: { id: string; amount: number; warnPct: number } | null;
};

function DeleteBudgetButton({ row }: { row: BudgetTableRow }) {
  const [state, action, pending] = useActionState(deleteBudget, deleteInitial);
  if (!row.existing) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <>
      <ActionToast id={`budget:${row.key}:delete`} state={state} error={state.error} success={state.success} />
      <ConfirmationDialog
        trigger={<Button type="button" variant="destructive" size="sm">{copy.remove}</Button>}
        title={copy.removeTitle(row.label)}
        description={copy.removeDescription}
        confirmLabel={copy.remove}
        pendingLabel={copy.removing}
        action={action}
        pending={pending}
        success={state.success}
      >
        <input type="hidden" name="budgetId" value={row.existing.id} />
      </ConfirmationDialog>
    </>
  );
}

export function BudgetTableForm({
  rows,
  currency,
}: {
  rows: BudgetTableRow[];
  currency: string;
}) {
  const [state, action, pending] = useActionState(saveBudgetsBatch, batchInitial);

  return (
    <div className="flex flex-col gap-4">
      <form id={FORM_ID} action={action} noValidate />
      <ActionToast
        id="budgets:batch"
        state={state}
        success={state.success}
        error={state.fieldErrors ? undefined : state.error}
      />

      <div className="hidden grid-cols-[minmax(10rem,1fr)_minmax(12rem,0.8fr)_minmax(9rem,0.45fr)_auto] gap-4 border-b px-3 pb-2 text-xs font-medium text-muted-foreground md:grid">
        <span>{copy.scope}</span>
        <span>{copy.amount}</span>
        <span>{copy.warn}</span>
        <span>{copy.actions}</span>
      </div>

      <div className="flex flex-col gap-3 md:gap-0 md:divide-y">
        {rows.map((row) => {
          const amountName = `amount|${row.key}`;
          const warnName = `warnPct|${row.key}`;
          return (
            <div
              key={row.key}
              className="grid gap-4 rounded-lg border p-4 md:grid-cols-[minmax(10rem,1fr)_minmax(12rem,0.8fr)_minmax(9rem,0.45fr)_auto] md:items-start md:rounded-none md:border-0 md:px-3 md:py-4"
            >
              <input type="hidden" name="row" value={row.key} form={FORM_ID} />
              <div>
                <span className="text-xs text-muted-foreground md:hidden">{copy.scope}</span>
                <p className="mt-0.5 text-sm font-medium">{row.label}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`amount-${row.key}`} className="md:sr-only">{copy.amount}</Label>
                <MoneyInput
                  id={`amount-${row.key}`}
                  name={amountName}
                  currency={currency}
                  defaultValue={row.existing?.amount ?? ""}
                  form={FORM_ID}
                />
                {state.fieldErrors?.[amountName] && (
                  <p className="text-xs text-destructive">{state.fieldErrors[amountName]}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`warn-${row.key}`} className="md:sr-only">{copy.warn}</Label>
                <Input
                  id={`warn-${row.key}`}
                  name={warnName}
                  type="number"
                  min={50}
                  max={99}
                  step={1}
                  defaultValue={row.existing?.warnPct ?? 80}
                  form={FORM_ID}
                  aria-invalid={state.fieldErrors?.[warnName] !== undefined}
                  className="tabular-nums"
                />
                {state.fieldErrors?.[warnName] && (
                  <p className="text-xs text-destructive">{state.fieldErrors[warnName]}</p>
                )}
              </div>
              <div className="flex min-h-8 items-center md:justify-end">
                <DeleteBudgetButton row={row} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs/relaxed text-muted-foreground">{copy.warnHelp}</p>
      {state.fieldErrors && <ActionStatus error={state.error} />}
      <div>
        <Button type="submit" form={FORM_ID} disabled={pending}>
          {pending ? copy.saving : copy.save}
        </Button>
      </div>
    </div>
  );
}
