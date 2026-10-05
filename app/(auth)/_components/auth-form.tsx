"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building02Icon,
  EyeIcon,
  EyeOffIcon,
  Key02Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useActionState, useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login, signup, type AuthFormState } from "@/lib/auth/actions";
import { PASSWORD_MIN } from "@/lib/auth/password";

import { GoogleButton } from "./google-button";
import { OtpDialog } from "./otp-dialog";

const copy = {
  title: "Assuma o controle do gasto com IA",
  subtitle:
    "Orçamentos, projeção de fechamento e avisos antecipados — entre para ver a resposta de hoje.",
  modeLogin: "Entrar",
  modeSignup: "Criar conta",
  companyName: "Nome da empresa",
  companyNamePlaceholder: "Sua empresa",
  email: "E-mail",
  emailPlaceholder: "voce@empresa.com",
  password: "Senha",
  passwordPlaceholder: "••••••••",
  passwordHint: `Pelo menos ${PASSWORD_MIN} caracteres. Sem exigência de maiúscula, número ou símbolo — o que protege é o comprimento.`,
  forgotPassword: "Esqueci minha senha",
  showPassword: "Mostrar senha",
  hidePassword: "Ocultar senha",
  submitLogin: "Entrar",
  submitSignup: "Criar conta",
  submittingLogin: "Entrando…",
  submittingSignup: "Criando conta…",
  or: "ou",
  accountDeleted:
    "A empresa e todos os dados do espaço foram excluídos do Denarius. Nada foi alterado nos provedores.",
  membershipLeft:
    "Você saiu da empresa. Seu acesso foi removido e os dados da empresa permanecem intactos.",
};

const initialState: AuthFormState = {};

type Mode = "login" | "signup";

const EASE = "var(--motion-ease-expressive)";

// Local icon-input composition — the shared Input primitive stays untouched
// (F5); the icon is decorative, the trailing slot hosts the password eye.
function IconInput({
  icon,
  trailing,
  children,
}: {
  icon: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
      >
        {icon}
      </span>
      {children}
      {trailing}
    </div>
  );
}

export function AuthForm({
  oauthError,
  notice,
}: {
  oauthError?: string;
  notice?: "account-deleted" | "membership-left";
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loginState, loginAction, loginPending] = useActionState(
    login,
    initialState,
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
    initialState,
  );
  const companyFieldId = useId();

  const isSignup = mode === "signup";
  const state = isSignup ? signupState : loginState;
  const pending = isSignup ? signupPending : loginPending;
  // Google errors arrive via the callback redirect (?error=oauth); only
  // meaningful in login mode and only until a form submission returns its own.
  // A validation failure marks the exact input instead (#58), so the banner
  // steps aside whenever there are field errors — the message is already there.
  const fieldErrors = state.fieldErrors;
  const shownError = fieldErrors
    ? undefined
    : (state.error ?? (isSignup ? undefined : oauthError));

  const inputClassName =
    "h-11 rounded-sm border-border bg-surface-control pl-10 text-base hover:border-border hover:bg-surface-hover focus-visible:border-ring focus-visible:bg-surface-control focus-visible:ring-1 focus-visible:ring-ring/40";
  const iconClassName = "size-4";

  return (
    <>
      <form
        action={isSignup ? signupAction : loginAction}
        className="flex flex-col gap-7"
      >
        <FieldGroup className="gap-5">
          {notice && (
            <p
              role="status"
              className="rounded-md border border-border bg-surface-control px-3 py-2 text-sm text-ink-secondary"
            >
              {notice === "account-deleted"
                ? copy.accountDeleted
                : copy.membershipLeft}
            </p>
          )}
          <div className="denarius-auth-enter flex flex-col gap-2.5">
            <h1 className="max-w-[15ch] text-display-sm font-light text-balance md:text-display">
              {copy.title}
            </h1>
            <p className="max-w-[44ch] text-sm/relaxed text-pretty text-ink-secondary">
              {copy.subtitle}
            </p>
          </div>

          <div className="denarius-auth-enter [animation-delay:60ms]">
            <div className="relative grid grid-cols-2 rounded-full bg-surface-control p-1">
              <span
                aria-hidden
                className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-tab-active transition-transform duration-(--motion-duration-max)"
                style={{
                  transitionTimingFunction: EASE,
                  transform: isSignup ? "translateX(100%)" : "translateX(0)",
                }}
              />
              {(
                [
                  ["login", copy.modeLogin],
                  ["signup", copy.modeSignup],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  shape="full"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={`relative z-10 h-11 bg-transparent text-sm font-medium transition-colors duration-(--motion-duration-standard) hover:bg-transparent ${
                    mode === value
                      ? "text-foreground"
                      : "text-ink-secondary hover:text-foreground"
                  }`}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Grid-rows collapse so the company field slides in/out with the
              mode instead of popping. Inert (+ no name match server-side)
              while hidden, so login submissions never carry it. */}
          <div
            aria-hidden={!isSignup}
            className={`grid transition-[grid-template-rows,opacity] duration-(--motion-duration-max) ${
              isSignup
                ? "[grid-template-rows:1fr] opacity-100"
                : "[grid-template-rows:0fr] opacity-0"
            }`}
            style={{ transitionTimingFunction: EASE }}
          >
            <div className="min-h-0 overflow-hidden">
              <Field className="pb-1">
                <FieldLabel htmlFor={companyFieldId}>
                  {copy.companyName}
                </FieldLabel>
                <IconInput icon={<HugeiconsIcon icon={Building02Icon} className={iconClassName} />}>
                  <Input
                    id={companyFieldId}
                    name="companyName"
                    type="text"
                    placeholder={copy.companyNamePlaceholder}
                    autoComplete="organization"
                    required={isSignup}
                    disabled={!isSignup}
                    tabIndex={isSignup ? undefined : -1}
                    aria-invalid={fieldErrors?.companyName !== undefined}
                    className={inputClassName}
                  />
                </IconInput>
                {fieldErrors?.companyName && (
                  <FieldError>{fieldErrors.companyName}</FieldError>
                )}
              </Field>
            </div>
          </div>

          <Field className="denarius-auth-enter [animation-delay:120ms]">
            <FieldLabel htmlFor="email">{copy.email}</FieldLabel>
            <IconInput icon={<HugeiconsIcon icon={Mail01Icon} className={iconClassName} />}>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={copy.emailPlaceholder}
                autoComplete="email"
                required
                aria-invalid={fieldErrors?.email !== undefined}
                className={inputClassName}
              />
            </IconInput>
            {fieldErrors?.email && <FieldError>{fieldErrors.email}</FieldError>}
          </Field>

          <Field className="denarius-auth-enter [animation-delay:120ms]">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="password">{copy.password}</FieldLabel>
              {/* Login only: in signup mode there is no password to recover. */}
              {!isSignup && (
                <Link
                  href="/auth/recuperar"
                  className="inline-flex min-h-11 items-center text-sm text-ink-secondary underline underline-offset-4 hover:text-foreground"
                >
                  {copy.forgotPassword}
                </Link>
              )}
            </div>
            <IconInput
              icon={<HugeiconsIcon icon={Key02Icon} className={iconClassName} />}
              trailing={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    showPassword ? copy.hidePassword : copy.showPassword
                  }
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-0 size-11 -translate-y-1/2"
                >
                  {showPassword ? (
                    <HugeiconsIcon icon={EyeOffIcon} className={iconClassName} />
                  ) : (
                    <HugeiconsIcon icon={EyeIcon} className={iconClassName} />
                  )}
                </Button>
              }
            >
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder={copy.passwordPlaceholder}
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={isSignup ? PASSWORD_MIN : undefined}
                aria-invalid={fieldErrors?.password !== undefined}
                className={`${inputClassName} pr-10`}
              />
            </IconInput>
            {fieldErrors?.password ? (
              <FieldError>{fieldErrors.password}</FieldError>
            ) : (
              isSignup && <FieldDescription>{copy.passwordHint}</FieldDescription>
            )}
          </Field>

          {shownError && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {shownError}
            </p>
          )}

          <Field className="denarius-auth-enter [animation-delay:180ms]">
            <Button
              type="submit"
              size="lg"
              loading={pending}
              loadingText={isSignup ? copy.submittingSignup : copy.submittingLogin}
              className="h-11 w-full"
            >
              {isSignup ? copy.submitSignup : copy.submitLogin}
            </Button>
          </Field>

          <FieldSeparator className="denarius-auth-enter [animation-delay:240ms] [&_[data-slot=field-separator-content]]:bg-surface-card">
            {copy.or}
          </FieldSeparator>
          <Field className="denarius-auth-enter [animation-delay:240ms]">
            <GoogleButton className="h-11 w-full" />
          </Field>
        </FieldGroup>
      </form>

      <OtpDialog state={signupState} email={signupState.email ?? ""} />
    </>
  );
}
