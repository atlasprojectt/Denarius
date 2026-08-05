"use client";

import { RiMailLine } from "@remixicon/react";
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
import { requestPasswordRecovery, type AuthFormState } from "@/lib/auth/actions";

const copy = {
  title: "Redefinir sua senha",
  subtitle:
    "Informe o e-mail da sua conta. Enviamos um link para você escolher uma senha nova.",
  email: "E-mail",
  emailPlaceholder: "voce@empresa.com",
  sameBrowser:
    "Abra o link no mesmo navegador em que você pediu — é ele que guarda a chave da redefinição.",
  submit: "Enviar link",
  submitting: "Enviando…",
  back: "Voltar para o login",
};

const initialState: AuthFormState = {};

export function RecoverForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordRecovery,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FieldGroup>
        <div className="denarius-auth-enter flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {copy.title}
          </h1>
          <p className="text-sm/relaxed text-balance text-muted-foreground">
            {copy.subtitle}
          </p>
        </div>

        <Field className="denarius-auth-enter [animation-delay:60ms]">
          <FieldLabel htmlFor="email">{copy.email}</FieldLabel>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
            >
              <RiMailLine className="size-4" />
            </span>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={copy.emailPlaceholder}
              autoComplete="email"
              required
              aria-invalid={state.fieldErrors?.email !== undefined}
              className="h-11 bg-background pl-10 text-[15px]"
            />
          </div>
          {state.fieldErrors?.email && (
            <FieldError>{state.fieldErrors.email}</FieldError>
          )}
        </Field>

        {/* One notice for every address: registered, unknown or a failed send
            all land here (the action explains why). */}
        <ActionStatus error={state.error} success={state.notice} />

        {state.notice && (
          <FieldDescription>{copy.sameBrowser}</FieldDescription>
        )}

        <Field className="denarius-auth-enter [animation-delay:120ms]">
          <Button
            type="submit"
            size="lg"
            loading={pending}
            loadingText={copy.submitting}
            className="w-full"
          >
            {copy.submit}
          </Button>
        </Field>

        <FieldDescription className="text-center">
          <Link href="/login" className="underline underline-offset-4">
            {copy.back}
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
