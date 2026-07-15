"use client";

import { useActionState, useEffect, useRef, useState } from "react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  // The team Select is controlled so it resets with the form ("" = shared);
  // form.reset() only clears native fields, not the Base UI Select.
  const [teamId, setTeamId] = useState("");

  // Reset the Select on a successful add (React's "adjust state during render"
  // pattern — the action returns a fresh state object on every dispatch).
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setTeamId("");
  }

  // Clear the native fields after a successful add — a DOM side effect, so it
  // lives in an effect.
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
              <Select
                name="teamId"
                items={{
                  "": copy.shared,
                  ...Object.fromEntries(teams.map((t) => [t.id, t.name])),
                }}
                value={teamId}
                onValueChange={(value) => setTeamId(value ?? "")}
              >
                <SelectTrigger id="teamId" className="h-8 w-full max-w-sm text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{copy.shared}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
