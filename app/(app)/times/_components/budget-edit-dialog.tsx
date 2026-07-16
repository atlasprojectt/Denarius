"use client";

import { useActionState } from "react";
import { RiPencilLine } from "@remixicon/react";

import { ActionStatus } from "@/components/domain/action-status";
import { MoneyInput } from "@/components/domain/money-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertBudget, type BudgetFormState } from "@/lib/budgets/actions";

// Inline budget editing for ONE team, from its diagnosis card (Fase 1:
// "Gerenciar orçamentos" now lives where the diagnosis is). Same validation
// truth as /ajustes/orcamentos: the shared zod budgetSchema behind the
// existing upsertBudget server action (F4) — nothing is duplicated. The full
// multi-scope table remains in Ajustes; this dialog only touches this team's
// guardrail. Admin-only at the render site (the action re-checks — never
// trust the client).

const copy = {
  edit: "Editar orçamento",
  define: "Definir orçamento",
  title: (team: string) => `Orçamento de ${team}`,
  description:
    "Limite mensal do time no período atual. O câmbio congelado do período não muda em edições.",
  amount: "Orçamento mensal",
  warnPct: "Avisar a partir de (% do orçamento)",
  submit: "Salvar",
  submitting: "Salvando…",
};

const initialState: BudgetFormState = {};

export function BudgetEditDialog({
  teamId,
  teamName,
  currency,
  existing,
}: {
  teamId: string;
  teamName: string;
  currency: string;
  /** Current-period budget for this team, or null to create one. */
  existing: { amount: number; warnPct: number } | null;
}) {
  const [state, formAction, pending] = useActionState(
    upsertBudget,
    initialState,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RiPencilLine className="size-4" />
          {existing ? copy.edit : copy.define}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{copy.title(teamName)}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <form action={formAction} noValidate className="flex flex-col gap-4">
          <input type="hidden" name="scope" value="team" />
          <input type="hidden" name="teamId" value={teamId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`budget-amount-${teamId}`}>{copy.amount}</Label>
            <MoneyInput
              id={`budget-amount-${teamId}`}
              name="amount"
              currency={currency}
              defaultValue={existing?.amount}
              invalid={state.fieldErrors?.amount !== undefined}
            />
            {state.fieldErrors?.amount && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.amount}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`budget-warn-${teamId}`}>{copy.warnPct}</Label>
            <Input
              id={`budget-warn-${teamId}`}
              name="warnPct"
              type="number"
              min={50}
              max={99}
              defaultValue={existing?.warnPct ?? 80}
              aria-invalid={state.fieldErrors?.warnPct !== undefined}
              className="w-24 tabular-nums"
            />
            {state.fieldErrors?.warnPct && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.warnPct}
              </p>
            )}
          </div>
          <DialogFooter className="items-center gap-3 sm:justify-between">
            <ActionStatus error={state.error} success={state.success} />
            <Button type="submit" disabled={pending}>
              {pending ? copy.submitting : copy.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
