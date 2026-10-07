"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { MailSend01Icon } from "@hugeicons/core-free-icons";
import { useActionState, useState } from "react";

import {
  ConfirmationDialogContent,
  ConfirmationDialogHeader,
} from "@/components/domain/confirmation-dialog";
import {
  EmailCodeField,
  EmailCodeInstructions,
  useResendCooldown,
} from "@/components/domain/email-code-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogFooter } from "@/components/ui/dialog";
import {
  resendSignupCode,
  verifyEmailOtp,
  type AuthFormState,
} from "@/lib/auth/actions";

const copy = {
  title: "Confirme seu e-mail",
  // Supabase mints this code; its lifetime is the project's e-mail OTP expiry
  // (3600 s, docs/backend.md §8), the same "1 hora" its e-mail template states.
  lifetime: "1 hora",
  cancel: "Cancelar",
  submit: "Confirmar código",
  submitting: "Confirmando…",
  reopenHint: (email: string) => `Enviamos um código para ${email}.`,
  reopen: "Digitar o código",
};

const initialState: AuthFormState = {};

/** Collects the signup confirmation code. Opened by the parent whenever a
 *  signup dispatch lands on the awaiting-confirmation branch. The e-mail
 *  carries only the code, no link, so closing the dialog leaves a way back. */
export function OtpDialog({
  state,
  email,
}: {
  state: AuthFormState;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, restartCooldown] = useResendCooldown();

  // Reopen on every fresh awaiting-confirmation result (the action returns a
  // new state identity per dispatch — the "adjust state during render" pattern).
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.awaitingOtp) {
      setOpen(true);
      setCode("");
      restartCooldown();
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

  // Restart the cooldown after a successful resend.
  const [prevResend, setPrevResend] = useState(resendState);
  if (resendState !== prevResend) {
    setPrevResend(resendState);
    if (resendState.notice) restartCooldown();
  }

  return (
    <>
      {state.awaitingOtp && !open && (
        <p
          role="status"
          className="mt-6 flex flex-wrap items-center justify-center gap-x-1.5 text-center text-xs text-muted-foreground"
        >
          {copy.reopenHint(email)}
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setOpen(true)}
            className="h-auto min-w-0 px-0 text-xs"
          >
            {copy.reopen}
          </Button>
        </p>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <ConfirmationDialogContent>
          <form action={verifyAction} className="contents">
            <ConfirmationDialogHeader
              tone="neutral"
              icon={<HugeiconsIcon icon={MailSend01Icon} />}
              title={copy.title}
              description={<EmailCodeInstructions email={email} />}
            />
            <input type="hidden" name="email" value={email} />
            <EmailCodeField
              id="otp-token"
              name="token"
              value={code}
              onValueChange={setCode}
              lifetime={copy.lifetime}
              error={verifyState.error ?? resendState.error}
              resent={resendState.notice !== undefined}
              resendAction={resendAction}
              resending={resending}
              cooldown={cooldown}
              disabled={verifying}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={verifying}>
                  {copy.cancel}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={code.length !== 6}
                loading={verifying}
                loadingText={copy.submitting}
              >
                {copy.submit}
              </Button>
            </DialogFooter>
          </form>
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}
