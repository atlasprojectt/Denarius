"use client";

import { useActionState, useState } from "react";
import { IconPencil } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertBudget, type BudgetFormState } from "@/lib/budgets/actions";

// Inline budget edit (frontend §2: editing is inline, pencil → modal). Reuses
// the same `upsertBudget` server action as the settings page — one write path,
// zod-validated server-side. Prefilled from the row it was opened on; closes
// itself once the action reports success (the page revalidates on the server).

const copy = {
  amount: "Valor do orçamento",
  warn: "Aviso em (%)",
  save: "Salvar",
  saving: "Salvando…",
  editOrg: "Editar orçamento da empresa",
  editTeam: (team: string) => `Editar orçamento — ${team}`,
  description: "Atualize o valor e o ponto de aviso deste orçamento.",
};

const initialState: BudgetFormState = {};

export function BudgetEditDialog({
  scope,
  teamId,
  teamName,
  currency,
  amount,
  warnPct,
  triggerLabel,
}: {
  scope: "org" | "team";
  teamId: string | null;
  teamName?: string;
  currency: string;
  amount: number;
  warnPct: number;
  /** Optional visible label; when omitted the trigger is an icon-only pencil. */
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  // Wrap the server action so the dialog closes on success (the action already
  // revalidated "/"); a validation error keeps it open to show the message.
  const [state, formAction, pending] = useActionState(
    async (prev: BudgetFormState, formData: FormData) => {
      const result = await upsertBudget(prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    initialState,
  );

  const id = `${scope}-${teamId ?? "org"}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerLabel ? (
          <Button variant="outline" size="sm">
            <IconPencil className="size-4" />
            {triggerLabel}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={scope === "org" ? copy.editOrg : copy.editTeam(teamName ?? "")}
            className="text-muted-foreground"
          >
            <IconPencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {scope === "org" ? copy.editOrg : copy.editTeam(teamName ?? "")}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="scope" value={scope} />
          {teamId !== null && <input type="hidden" name="teamId" value={teamId} />}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`amount-${id}`}>
              {copy.amount} ({currency})
            </Label>
            <Input
              id={`amount-${id}`}
              name="amount"
              type="number"
              min={0.01}
              step="0.01"
              required
              defaultValue={amount}
              className="tabular-nums"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`warn-${id}`}>{copy.warn}</Label>
            <Input
              id={`warn-${id}`}
              name="warnPct"
              type="number"
              min={50}
              max={99}
              step={1}
              defaultValue={warnPct}
              className="w-24 tabular-nums"
            />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? copy.saving : copy.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
