"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
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
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="font-semibold">{copy.title}</h2>
      <form
        ref={formRef}
        action={formAction}
        className="mt-4 flex flex-col gap-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="tool">{copy.tool}</Label>
            <Input
              id="tool"
              name="tool"
              placeholder={copy.toolPlaceholder}
              required
            />
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
              required
              className="tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unitPrice">
              {copy.price} ({currency})
            </Label>
            <Input
              id="unitPrice"
              name="unitPrice"
              type="number"
              min={0}
              step="0.01"
              required
              className="tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="teamId">{copy.team}</Label>
            <select
              id="teamId"
              name="teamId"
              defaultValue=""
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
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

        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="text-sm font-medium text-green-700">
            {state.success}
          </p>
        )}

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? copy.submitting : copy.submit}
          </Button>
        </div>
      </form>
    </section>
  );
}
