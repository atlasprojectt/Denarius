"use client";

import { RiEyeLine, RiEyeOffLine } from "@remixicon/react";
import { useActionState, useState } from "react";

import { ActionToast } from "@/components/domain/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, type AuthFormState } from "@/lib/auth/actions";
import { PASSWORD_MIN } from "@/lib/auth/password";

const copy = {
  current: "Senha atual",
  next: "Nova senha",
  confirmation: "Repita a nova senha",
  hint: `Pelo menos ${PASSWORD_MIN} caracteres. Sem exigência de maiúscula, número ou símbolo — o que protege é o comprimento.`,
  otherSessions:
    "Ao salvar, as outras sessões da sua conta são encerradas. Esta continua conectada.",
  showPassword: "Mostrar senhas",
  hidePassword: "Ocultar senhas",
  save: "Alterar senha",
  saving: "Alterando...",
};

const initialState: AuthFormState = {};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePassword,
    initialState,
  );
  const [show, setShow] = useState(false);

  const type = show ? "text" : "password";

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">{copy.current}</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            name="currentPassword"
            type={type}
            autoComplete="current-password"
            required
            aria-invalid={state.fieldErrors?.currentPassword !== undefined}
            className="h-10 pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={show ? copy.hidePassword : copy.showPassword}
            onClick={() => setShow((v) => !v)}
            className="absolute top-1/2 right-1 -translate-y-1/2"
          >
            {show ? (
              <RiEyeOffLine className="size-4" />
            ) : (
              <RiEyeLine className="size-4" />
            )}
          </Button>
        </div>
        {state.fieldErrors?.currentPassword && (
          <p role="alert" className="text-xs/relaxed text-destructive">
            {state.fieldErrors.currentPassword}
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{copy.next}</Label>
          <Input
            id="password"
            name="password"
            type={type}
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN}
            aria-describedby="new-password-description"
            aria-invalid={state.fieldErrors?.password !== undefined}
            className="h-10"
          />
          {state.fieldErrors?.password && (
            <p role="alert" className="text-xs/relaxed text-destructive">
              {state.fieldErrors.password}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmation">{copy.confirmation}</Label>
          <Input
            id="confirmation"
            name="confirmation"
            type={type}
            autoComplete="new-password"
            required
            aria-invalid={state.fieldErrors?.confirmation !== undefined}
            className="h-10"
          />
          {state.fieldErrors?.confirmation && (
            <p role="alert" className="text-xs/relaxed text-destructive">
              {state.fieldErrors.confirmation}
            </p>
          )}
        </div>
      </div>

      <p
        id="new-password-description"
        className="text-xs/relaxed text-muted-foreground"
      >
        {copy.hint}
      </p>
      <p className="text-xs/relaxed text-muted-foreground">
        {copy.otherSessions}
      </p>

      <div className="flex justify-end">
        <Button
          type="submit"
          loading={pending}
          loadingText={copy.saving}
          className="w-full md:w-auto"
        >
          {copy.save}
        </Button>
      </div>

      {/* The form error that is not tied to one input (expired session, a
          Google-only account) still needs somewhere to land. */}
      <ActionToast
        id="change-password"
        state={state}
        success={state.notice}
        error={state.fieldErrors ? undefined : state.error}
      />
    </form>
  );
}
