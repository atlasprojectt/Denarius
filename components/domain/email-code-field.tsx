"use client";

import { useEffect, useState } from "react";

import { OneTimeCodeInput } from "@/components/domain/one-time-code-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EMAIL_CODE_RESEND_COOLDOWN_SECONDS } from "@/lib/auth/email-code-policy";

const copy = {
  instructions: "Digite o código de 6 dígitos que enviamos para",
  label: "Código de verificação",
  placeholder: "000000",
  expiresIn: (lifetime: string) => `O código expira em ${lifetime}.`,
  resent: "Enviamos um novo código.",
  resend: "Reenviar código",
  resending: "Reenviando…",
  resendIn: (seconds: number) => `Reenviar em ${seconds}s`,
};

/** The sentence every code screen opens with; the address stands out so the
 *  person can tell at a glance whether the code went to the right inbox. */
export function EmailCodeInstructions({ email }: { email: string }) {
  return (
    <>
      {copy.instructions}{" "}
      <span className="font-medium text-foreground [overflow-wrap:anywhere]">
        {email}
      </span>
      .
    </>
  );
}

/** Seconds left before another code may be requested; `restart` after a send. */
export function useResendCooldown(): [seconds: number, restart: () => void] {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  return [seconds, () => setSeconds(EMAIL_CODE_RESEND_COOLDOWN_SECONDS)];
}

/**
 * The code block every e-mail verification shares (signup confirmation,
 * password change, account deletion): the six boxes, then one line that pairs
 * what the person needs to know (expiry, a fresh code, or what went wrong)
 * with the resend. It renders inside the caller's verify form; resend posts
 * that same form to `resendAction`.
 */
export function EmailCodeField({
  id,
  name,
  value,
  onValueChange,
  lifetime,
  error,
  resent = false,
  resendAction,
  resending,
  cooldown,
  disabled = false,
}: {
  id: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  /** How long the code lives, formatted ("10 minutos", "1 hora"). */
  lifetime: string;
  /** About the code itself; replaces the help line. */
  error?: string;
  /** A fresh code went out from this screen. */
  resent?: boolean;
  resendAction: (payload: FormData) => void;
  resending: boolean;
  cooldown: number;
  /** While the code is being checked. */
  disabled?: boolean;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{copy.label}</Label>
      <OneTimeCodeInput
        id={id}
        name={name}
        value={value}
        onValueChange={onValueChange}
        placeholder={copy.placeholder}
        autoFocus
        invalid={error !== undefined}
        describedBy={error ? errorId : undefined}
      />
      <div className="mt-1 flex items-baseline justify-between gap-3">
        {error ? (
          <p id={errorId} role="alert" className="text-xs/relaxed text-destructive">
            {error}
          </p>
        ) : (
          <p role="status" className="text-xs/relaxed text-muted-foreground">
            {resent ? copy.resent : copy.expiresIn(lifetime)}
          </p>
        )}
        <Button
          type="submit"
          variant="link"
          size="sm"
          formAction={resendAction}
          formNoValidate
          disabled={cooldown > 0 || disabled}
          loading={resending}
          loadingText={copy.resending}
          className="h-auto min-w-0 shrink-0 px-0 text-xs tabular-nums"
        >
          {cooldown > 0 ? copy.resendIn(cooldown) : copy.resend}
        </Button>
      </div>
    </div>
  );
}
