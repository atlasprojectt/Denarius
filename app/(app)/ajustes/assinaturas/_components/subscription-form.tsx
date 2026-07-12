"use client";

import { useActionState, useEffect, useRef } from "react";

import { ActionStatus } from "@/components/domain/action-status";
import { MoneyInput } from "@/components/domain/money-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSubscription,
  type SubscriptionFormState,
} from "@/lib/subscriptions/actions";

const copy = {
  title: "Adicionar assinatura",
  tool: "Ferramenta",
  toolPlaceholder: "ChatGPT Team, Claude Pro…",
  seats: "Assentos",
  price: "Preço por assento / mês",
  team: "Time",
  shared: "Compartilhada (empresa toda)",
  submit: "Adicionar",
  submitting: "Adicionando…",
};

type Team = { id: string; name: string };

const initialState: SubscriptionFormState = {};

export function SubscriptionForm({
  teams,
  currency,
}: {
  teams: Team[];
  currency: string;
}) {
  const [state, formAction, pending] = useActionState(
    createSubscription,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the fields after a successful add — a DOM side effect, so it lives
  // in an effect (the action returns a fresh state object on every dispatch).
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="tool">{copy.tool}</Label>
              <Input
                id="tool"
                name="tool"
                placeholder={copy.toolPlaceholder}
                aria-invalid={state.fieldErrors?.tool !== undefined}
              />
              {state.fieldErrors?.tool && <p className="text-xs text-destructive">{state.fieldErrors.tool}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seatCount">{copy.seats}</Label>
              <Input
                id="seatCount"
                name="seatCount"
                type="number"
                min={1}
                step={1}
                defaultValue={1}
                aria-invalid={state.fieldErrors?.seatCount !== undefined}
                className="tabular-nums"
              />
              {state.fieldErrors?.seatCount && <p className="text-xs text-destructive">{state.fieldErrors.seatCount}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unitPrice">
                {copy.price} ({currency})
              </Label>
              <MoneyInput
                id="unitPrice"
                name="unitPrice"
                currency={currency}
                invalid={state.fieldErrors?.unitPrice !== undefined}
              />
              {state.fieldErrors?.unitPrice && <p className="text-xs text-destructive">{state.fieldErrors.unitPrice}</p>}
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="teamId">{copy.team}</Label>
              <select
                id="teamId"
                name="teamId"
                defaultValue=""
                className="h-8 max-w-sm rounded-md border border-input bg-transparent px-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="">{copy.shared}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ActionStatus error={state.error} success={state.success} />

          <div>
            <Button type="submit" disabled={pending}>
              {pending ? copy.submitting : copy.submit}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
