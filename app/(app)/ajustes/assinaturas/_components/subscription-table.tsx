"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <tr className="border-b last:border-b-0">
        <td className="py-2.5 pr-2 font-medium">{subscription.tool}</td>
        <td className="py-2.5 pr-2 tabular-nums">{subscription.seatCount}</td>
        <td className="py-2.5 pr-2">
          {subscription.teamName ?? (
            <span className="text-muted-foreground">{copy.shared}</span>
          )}
        </td>
        <td className="py-2.5 pr-2 text-right tabular-nums">
          {subscription.monthly}
        </td>
        <td className="py-2.5 pr-2 text-right tabular-nums">
          {subscription.accrued}
        </td>
        <td className="py-2.5 text-right">
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
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b bg-muted/30">
      <td colSpan={6} className="py-3">
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
            className="h-9 w-48 bg-background"
          />
          <Input
            name="seatCount"
            type="number"
            min={1}
            step={1}
            defaultValue={subscription.seatCount}
            required
            className="h-9 w-20 bg-background tabular-nums"
          />
          <Input
            name="unitPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={subscription.unitPrice}
            required
            className="h-9 w-28 bg-background tabular-nums"
          />
          <select
            name="teamId"
            defaultValue={subscription.teamId ?? ""}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">{copy.shared}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          {updateState.error && (
            <p role="alert" className="text-sm text-destructive">
              {updateState.error}
            </p>
          )}
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
      </td>
    </tr>
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
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-2 font-medium">{copy.tool}</th>
            <th className="py-2 pr-2 font-medium">{copy.seats}</th>
            <th className="py-2 pr-2 font-medium">{copy.team}</th>
            <th className="py-2 pr-2 text-right font-medium">{copy.monthly}</th>
            <th className="py-2 pr-2 text-right font-medium">{copy.accrued}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((subscription) => (
            <SubscriptionRow
              key={subscription.id}
              subscription={subscription}
              teams={teams}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
