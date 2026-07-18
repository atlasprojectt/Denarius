"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { completeOnboarding, type AuthFormState } from "@/lib/auth/actions";

const copy = {
  title: "Qual é o nome da sua empresa?",
  subtitle:
    "Isso cria o espaço da sua empresa no Denarius — seus dados ficam isolados dos demais clientes.",
  company: "Nome da empresa",
  submit: "Concluir cadastro",
  submitting: "Concluindo…",
};

const initialState: AuthFormState = {};

export function OnboardingForm({
  defaultCompanyName,
}: {
  defaultCompanyName: string;
}) {
  const [state, formAction, pending] = useActionState(
    completeOnboarding,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FieldGroup>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <Field>
          <FieldLabel htmlFor="companyName">{copy.company}</FieldLabel>
          <Input
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            defaultValue={defaultCompanyName}
            required
            className="bg-background"
          />
          <FieldDescription>
            Você poderá ajustar isso depois em Ajustes.
          </FieldDescription>
        </Field>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Field>
          <Button type="submit" loading={pending} loadingText={copy.submitting}>
            {copy.submit}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
