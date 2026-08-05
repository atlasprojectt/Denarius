"use client";

import Link from "next/link";
import { useActionState } from "react";

import { ActionStatus } from "@/components/domain/action-status";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { acceptInvitation, type InviteFormState } from "@/lib/invitations/actions";

const copy = {
  title: (company: string) => `Entrar no Denarius de ${company}`,
  subtitle: "Escolha uma senha para acessar.",
  email: "E-mail",
  emailNote: "O convite é para este endereço.",
  password: "Senha",
  passwordHint: `Pelo menos ${PASSWORD_MIN} caracteres. Sem exigência de maiúscula, número ou símbolo — o que protege é o comprimento.`,
  submit: "Aceitar convite",
  submitting: "Criando acesso…",
  hasAccount: "Já tem conta?",
  loginLink: "Entrar",
};

const initialState: InviteFormState = {};

export function AcceptForm({
  token,
  email,
  companyName,
}: {
  token: string;
  email: string;
  companyName: string;
}) {
  const [state, formAction, pending] = useActionState(
    acceptInvitation,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="token" value={token} />
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold text-balance">{copy.title(companyName)}</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {copy.subtitle}
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="email">{copy.email}</FieldLabel>
          {/* Fixed, not editable: the token proves THIS address. */}
          <Input id="email" value={email} readOnly disabled />
          <FieldDescription>{copy.emailNote}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="password">{copy.password}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN}
            aria-invalid={state.fieldErrors?.password !== undefined}
          />
          {state.fieldErrors?.password ? (
            <FieldError>{state.fieldErrors.password}</FieldError>
          ) : (
            <FieldDescription>{copy.passwordHint}</FieldDescription>
          )}
        </Field>

        <ActionStatus error={state.error} />

        <Button type="submit" loading={pending} loadingText={copy.submitting}>
          {copy.submit}
        </Button>

        <FieldDescription className="text-center">
          {copy.hasAccount}{" "}
          <Link href="/login" className="underline underline-offset-4">
            {copy.loginLink}
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
