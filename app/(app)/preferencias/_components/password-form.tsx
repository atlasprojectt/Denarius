"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  EyeIcon,
  EyeOffIcon,
  MailSend01Icon,
} from "@hugeicons/core-free-icons";
import { useActionState, useEffect, useState } from "react";

import { OneTimeCodeInput } from "@/components/domain/one-time-code-input";
import { ActionToast } from "@/components/domain/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePassword,
  requestPasswordChangeCode,
  type AuthFormState,
} from "@/lib/auth/actions";
import { PASSWORD_MIN } from "@/lib/auth/password";

const copy = {
  rowTitle: "Senha",
  rowDescription: (email: string) =>
    `Para trocar, confirmamos com um código de 6 dígitos enviado para ${email}.`,
  start: "Alterar senha",
  sending: "Enviando código…",
  sentTo: (email: string) =>
    `Enviamos um código de 6 dígitos para ${email}. Ele expira em poucos minutos.`,
  codeLabel: "Código de verificação",
  codePlaceholder: "000000",
  resend: "Reenviar código",
  resending: "Reenviando…",
  resendIn: (seconds: number) => `Reenviar em ${seconds}s`,
  next: "Nova senha",
  confirmation: "Repita a nova senha",
  hint: `Pelo menos ${PASSWORD_MIN} caracteres. Sem exigência de maiúscula, número ou símbolo — o que protege é o comprimento.`,
  otherSessions:
    "Ao salvar, as outras sessões da sua conta são encerradas. Esta continua conectada.",
  showPassword: "Mostrar senhas",
  hidePassword: "Ocultar senhas",
  cancel: "Cancelar",
  save: "Alterar senha",
  saving: "Alterando…",
};

const initialState: AuthFormState = {};
const RESEND_COOLDOWN_S = 60;

/**
 * Two steps, one screen: ask for a code e-mailed to the account's address,
 * then send it with the new password. The server checks the code; this only
 * walks the person through it.
 */
export function PasswordForm({ email }: { email: string }) {
  const [requestState, requestAction, requesting] = useActionState(
    requestPasswordChangeCode,
    initialState,
  );
  const [changeState, changeAction, changing] = useActionState(
    changePassword,
    initialState,
  );

  const [step, setStep] = useState<"idle" | "code">("idle");
  const [cooldown, setCooldown] = useState(0);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function resetFields() {
    setCode("");
    setPassword("");
    setConfirmation("");
    setShow(false);
    setFieldErrors({});
  }

  // Each dispatch returns a fresh state object — react to it once, during
  // render, instead of syncing through an effect.
  const [prevRequest, setPrevRequest] = useState(requestState);
  if (requestState !== prevRequest) {
    setPrevRequest(requestState);
    if (requestState.notice) {
      setStep("code");
      setCooldown(RESEND_COOLDOWN_S);
      setCode("");
      setFieldErrors({});
    }
  }

  const [prevChange, setPrevChange] = useState(changeState);
  if (changeState !== prevChange) {
    setPrevChange(changeState);
    if (changeState.notice) {
      setStep("idle");
      resetFields();
    } else {
      setFieldErrors(changeState.fieldErrors ?? {});
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const type = show ? "text" : "password";

  return (
    <div className="flex flex-col gap-5">
      {step === "idle" ? (
        <form
          action={requestAction}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <div className="min-w-0">
            <p className="text-ui font-medium">{copy.rowTitle}</p>
            <p className="mt-0.5 text-xs/relaxed text-muted-foreground">
              {copy.rowDescription(email)}
            </p>
          </div>
          <Button
            type="submit"
            variant="secondary"
            loading={requesting}
            loadingText={copy.sending}
            className="w-full shrink-0 sm:w-auto"
          >
            {copy.start}
          </Button>
        </form>
      ) : (
        <form action={changeAction} className="flex flex-col gap-5">
          <p
            role="status"
            className="flex items-start gap-2.5 rounded-md bg-muted/60 px-3 py-2.5 text-xs/relaxed text-ink-secondary"
          >
            <HugeiconsIcon
              icon={MailSend01Icon}
              className="mt-px size-4 shrink-0"
              aria-hidden
            />
            {copy.sentTo(email)}
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password-change-code">{copy.codeLabel}</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <OneTimeCodeInput
                id="password-change-code"
                name="code"
                value={code}
                onValueChange={setCode}
                placeholder={copy.codePlaceholder}
                autoFocus
                invalid={fieldErrors.code !== undefined}
                describedBy={fieldErrors.code ? "password-change-code-error" : undefined}
                className="w-full sm:w-72"
              />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                formAction={requestAction}
                formNoValidate
                loading={requesting}
                loadingText={copy.resending}
                disabled={cooldown > 0 || changing}
                className="self-start sm:self-center"
              >
                {cooldown > 0 ? copy.resendIn(cooldown) : copy.resend}
              </Button>
            </div>
            {fieldErrors.code && (
              <p
                id="password-change-code-error"
                role="alert"
                className="text-xs/relaxed text-destructive"
              >
                {fieldErrors.code}
              </p>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{copy.next}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={type}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={PASSWORD_MIN}
                  aria-describedby="new-password-description"
                  aria-invalid={fieldErrors.password !== undefined}
                  className="h-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={show ? copy.hidePassword : copy.showPassword}
                  aria-pressed={show}
                  onClick={() => setShow((value) => !value)}
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                >
                  <HugeiconsIcon
                    icon={show ? EyeOffIcon : EyeIcon}
                    className="size-4"
                  />
                </Button>
              </div>
              {fieldErrors.password && (
                <p role="alert" className="text-xs/relaxed text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmation">{copy.confirmation}</Label>
              <Input
                id="confirmation"
                name="confirmation"
                type={type}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                required
                aria-invalid={fieldErrors.confirmation !== undefined}
                className="h-10"
              />
              {fieldErrors.confirmation && (
                <p role="alert" className="text-xs/relaxed text-destructive">
                  {fieldErrors.confirmation}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p
              id="new-password-description"
              className="text-xs/relaxed text-muted-foreground"
            >
              {copy.hint}
            </p>
            <p className="text-xs/relaxed text-muted-foreground">
              {copy.otherSessions}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={changing}
              onClick={() => {
                setStep("idle");
                resetFields();
              }}
            >
              {copy.cancel}
            </Button>
            <Button
              type="submit"
              loading={changing}
              loadingText={copy.saving}
              disabled={code.length !== 6}
            >
              {copy.save}
            </Button>
          </div>
        </form>
      )}

      <ActionToast
        id="password-change-code"
        state={requestState}
        error={requestState.error}
      />
      {/* An error that is not tied to one input (expired session, the
          limiter) still needs somewhere to land. */}
      <ActionToast
        id="change-password"
        state={changeState}
        success={changeState.notice}
        error={changeState.fieldErrors ? undefined : changeState.error}
      />
    </div>
  );
}
