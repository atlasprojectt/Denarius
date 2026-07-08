"use client";

import { useActionState, useState } from "react";

import { ActionStatus } from "@/components/domain/action-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteSubscription,
  updateSubscription,
  type SubscriptionFormState,
} from "@/lib/subscriptions/actions";

const copy = {
  tool: "Ferramenta",
  seats: "Assentos",
  team: "Time",
  monthly: "Mês",
  accrued: "Acumulado",
  shared: "Compartilhada",
  edit: "Editar",
  save: "Salvar",
  saving: "Salvando…",
  cancel: "Cancelar",
  remove: "Remover",
  removing: "Removendo…",
  confirmRemove: "Remover esta assinatura?",
};

type Subscription = {
  id: string;
  tool: string;
  seatCount: number;
  unitPrice: number;
  teamId: string | null;
  teamName: string | null;
  monthly: string;
  accrued: string;
};
type Team = { id: string; name: string };

const initialState: SubscriptionFormState = {};

function SubscriptionRow({
  subscription,
  teams,
}: {
  subscription: Subscription;
  teams: Team[];
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updating] = useActionState(
    updateSubscription,
    initialState,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteSubscription,
    initialState,
  );

  const [prevState, setPrevState] = useState(updateState);
  if (updateState !== prevState) {
    setPrevState(updateState);
    if (updateState.success) setEditing(false);
  }

  if (!editing) {
    return (
      <TableRow>
        <TableCell className="font-medium">{subscription.tool}</TableCell>
        <TableCell className="tabular-nums">{subscription.seatCount}</TableCell>
        <TableCell>
          {subscription.teamName ?? (
            <span className="text-muted-foreground">{copy.shared}</span>
          )}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {subscription.monthly}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {subscription.accrued}
        </TableCell>
        <TableCell className="text-right">
          {deleteState.error && (
            <span role="alert" className="mr-2 text-xs text-destructive">
              {deleteState.error}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            {copy.edit}
          </Button>
          <form action={deleteAction} className="inline">
            <input
              type="hidden"
              name="subscriptionId"
              value={subscription.id}
            />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={deleting}
              className="text-destructive hover:text-destructive"
              onClick={(event) => {
                if (!confirm(copy.confirmRemove)) event.preventDefault();
              }}
            >
              {deleting ? copy.removing : copy.remove}
            </Button>
          </form>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="bg-muted/30">
      <TableCell colSpan={6} className="py-3 whitespace-normal">
        <form
          action={updateAction}
          className="flex flex-wrap items-center gap-3"
        >
          <input
            type="hidden"
            name="subscriptionId"
            value={subscription.id}
          />
          <Input
            name="tool"
            defaultValue={subscription.tool}
            required
            className="h-8 w-48 bg-background"
          />
          <Input
            name="seatCount"
            type="number"
            min={1}
            step={1}
            defaultValue={subscription.seatCount}
            required
            className="h-8 w-20 bg-background tabular-nums"
          />
          <Input
            name="unitPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={subscription.unitPrice}
            required
            className="h-8 w-28 bg-background tabular-nums"
          />
          <select
            name="teamId"
            defaultValue={subscription.teamId ?? ""}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">{copy.shared}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <ActionStatus error={updateState.error} />
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              {copy.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={updating}>
              {updating ? copy.saving : copy.save}
            </Button>
          </div>
        </form>
      </TableCell>
    </TableRow>
  );
}

export function SubscriptionTable({
  subscriptions,
  teams,
}: {
  subscriptions: Subscription[];
  teams: Team[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{copy.tool}</TableHead>
          <TableHead>{copy.seats}</TableHead>
          <TableHead>{copy.team}</TableHead>
          <TableHead className="text-right">{copy.monthly}</TableHead>
          <TableHead className="text-right">{copy.accrued}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {subscriptions.map((subscription) => (
          <SubscriptionRow
            key={subscription.id}
            subscription={subscription}
            teams={teams}
          />
        ))}
      </TableBody>
    </Table>
  );
}
