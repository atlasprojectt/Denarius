"use client";

import { RiMailSendLine } from "@remixicon/react";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  resendSignupCode,
  verifyEmailOtp,
  type AuthFormState,
} from "@/lib/auth/actions";

const copy = {
  title: "Confirme seu e-mail",
  description: (email: string) =>
    `Enviamos um código de 6 dígitos para ${email}.`,
  codeLabel: "Código de confirmação",
  submit: "Confirmar",
  submitting: "Confirmando…",
  resend: "Reenviar código",
  resending: "Reenviando…",
  resendIn: (s: number) => `Reenviar em ${s}s`,
  dismissHint: "Você também pode confirmar depois pelo link do e-mail.",
};

const initialState: AuthFormState = {};
const RESEND_COOLDOWN_S = 60;

/** Collects the signup confirmation code. Opened by the parent whenever a
 *  signup dispatch lands on the awaiting-confirmation branch; dismissible —
 *  the e-mail link (or a later login) still completes the flow. */
export function OtpDialog({
  state,
  email,
}: {
  state: AuthFormState;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Reopen on every fresh awaiting-confirmation result (the action returns a
  // new state identity per dispatch — the "adjust state during render" pattern).
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.awaitingOtp) {
      setOpen(true);
      setCooldown(RESEND_COOLDOWN_S);
    }
  }

  const [verifyState, verifyAction, verifying] = useActionState(
    verifyEmailOtp,
    initialState,
  );
  const [resendState, resendAction, resending] = useActionState(
    resendSignupCode,
    initialState,
  );

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Restart the cooldown after a successful resend.
  const [prevResend, setPrevResend] = useState(resendState);
  if (resendState !== prevResend) {
    setPrevResend(resendState);
    if (resendState.notice) setCooldown(RESEND_COOLDOWN_S);
  }

  const error = verifyState.error ?? resendState.error;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain max-sm:[&_[data-slot=dialog-close]]:size-11 sm:max-w-sm">
        <DialogHeader>
          <span
            aria-hidden
            className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <RiMailSendLine className="size-5" />
          </span>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description(email)}</DialogDescription>
        </DialogHeader>
        <form action={verifyAction} className="flex flex-col gap-4">
          <input type="hidden" name="email" value={email} />
          <label htmlFor="otp-token" className="sr-only">
            {copy.codeLabel}
          </label>
          <Input
            id="otp-token"
            name="token"
            placeholder="••••••"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            className="h-12 bg-background text-center text-2xl font-medium tracking-[0.5em] tabular-nums"
          />
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {resendState.notice && !error && (
            <p role="status" className="text-sm text-muted-foreground">
              {resendState.notice}
            </p>
          )}
          <Button
            type="submit"
            loading={verifying}
            loadingText={copy.submitting}
            className="h-11 w-full text-sm"
          >
            {copy.submit}
          </Button>
        </form>
        <div className="flex flex-col items-center gap-1">
          <form action={resendAction} className="contents">
            <input type="hidden" name="email" value={email} />
            <Button
              type="submit"
              variant="ghost"
              loading={resending}
              loadingText={copy.resending}
              disabled={cooldown > 0}
              className="h-11 text-sm"
            >
              {cooldown > 0 ? copy.resendIn(cooldown) : copy.resend}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">
            {copy.dismissHint}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
