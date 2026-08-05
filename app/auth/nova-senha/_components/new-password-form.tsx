"use client";

import { RiEyeLine, RiEyeOffLine, RiKey2Line } from "@remixicon/react";
import { useActionState, useState } from "react";

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
import { resetPassword, type AuthFormState } from "@/lib/auth/actions";
import { PASSWORD_MIN } from "@/lib/auth/password";

const copy = {
  title: "Escolha uma senha nova",
  subtitle: (email: string) => `Você está redefinindo a senha de ${email}.`,
  subtitleAnonymous: "Escolha a senha que passará a valer para a sua conta.",
  password: "Nova senha",
  passwordHint: `Pelo menos ${PASSWORD_MIN} caracteres. Sem exigência de maiúscula, número ou símbolo — o que protege é o comprimento.`,
  confirmation: "Repita a senha",
  showPassword: "Mostrar senha",
  hidePassword: "Ocultar senha",
  otherSessions:
    "Ao salvar, as outras sessões da sua conta são encerradas — se alguém mais estava conectado, deixa de estar.",
  submit: "Salvar e entrar",
  submitting: "Salvando…",
};

const initialState: AuthFormState = {};

export function NewPasswordForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);
  const [showPassword, setShowPassword] = useState(false);

  const inputClassName = "h-11 bg-background pl-10 text-[15px]";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FieldGroup>
        <div className="denarius-auth-enter flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {copy.title}
          </h1>
          <p className="text-sm/relaxed text-balance text-muted-foreground">
            {email ? copy.subtitle(email) : copy.subtitleAnonymous}
          </p>
        </div>

        <Field className="denarius-auth-enter [animation-delay:60ms]">
          <FieldLabel htmlFor="password">{copy.password}</FieldLabel>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
            >
              <RiKey2Line className="size-4" />
            </span>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
              aria-invalid={state.fieldErrors?.password !== undefined}
              className={`${inputClassName} pr-10`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={showPassword ? copy.hidePassword : copy.showPassword}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-1 -translate-y-1/2"
            >
              {showPassword ? (
                <RiEyeOffLine className="size-4" />
              ) : (
                <RiEyeLine className="size-4" />
              )}
            </Button>
          </div>
          {state.fieldErrors?.password ? (
            <FieldError>{state.fieldErrors.password}</FieldError>
          ) : (
            <FieldDescription>{copy.passwordHint}</FieldDescription>
          )}
        </Field>

        <Field className="denarius-auth-enter [animation-delay:120ms]">
          <FieldLabel htmlFor="confirmation">{copy.confirmation}</FieldLabel>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
            >
              <RiKey2Line className="size-4" />
            </span>
            <Input
              id="confirmation"
              name="confirmation"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              aria-invalid={state.fieldErrors?.confirmation !== undefined}
              className={inputClassName}
            />
          </div>
          {state.fieldErrors?.confirmation && (
            <FieldError>{state.fieldErrors.confirmation}</FieldError>
          )}
        </Field>

        {!state.fieldErrors && <ActionStatus error={state.error} />}

        <FieldDescription>{copy.otherSessions}</FieldDescription>

        <Field className="denarius-auth-enter [animation-delay:180ms]">
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
      </FieldGroup>
    </form>
  );
}
