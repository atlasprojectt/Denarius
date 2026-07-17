"use client";

import {
  RiBuildingLine,
  RiEyeLine,
  RiEyeOffLine,
  RiKey2Line,
  RiMailLine,
} from "@remixicon/react";
import { useActionState, useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login, signup, type AuthFormState } from "@/lib/auth/actions";

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
  showPassword: "Mostrar senha",
  hidePassword: "Ocultar senha",
  submitLogin: "Entrar",
  submitSignup: "Criar conta",
  submittingLogin: "Entrando…",
  submittingSignup: "Criando conta…",
  or: "ou",
};

const initialState: AuthFormState = {};

type Mode = "login" | "signup";

const EASE = "cubic-bezier(0.16,1,0.3,1)";

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

export function AuthForm({ oauthError }: { oauthError?: string }) {
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
  const shownError = state.error ?? (isSignup ? undefined : oauthError);

  const inputClassName = "h-11 rounded-lg bg-background pl-10 text-[15px]";
  const iconClassName = "size-4";

  return (
    <>
      <form
        action={isSignup ? signupAction : loginAction}
        className="flex flex-col gap-6"
      >
        <FieldGroup>
          <div className="denarius-auth-enter flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              {copy.title}
            </h1>
            <p className="text-sm/relaxed text-balance text-muted-foreground">
              {copy.subtitle}
            </p>
          </div>

          <div className="denarius-auth-enter [animation-delay:60ms]">
            <div className="relative grid grid-cols-2 rounded-lg bg-muted p-1">
              <span
                aria-hidden
                className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-background shadow-sm transition-transform duration-300"
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
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={`relative z-10 h-9 rounded-md text-sm font-medium transition-colors duration-300 ${
                    mode === value
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid-rows collapse so the company field slides in/out with the
              mode instead of popping. Inert (+ no name match server-side)
              while hidden, so login submissions never carry it. */}
          <div
            aria-hidden={!isSignup}
            className={`grid transition-[grid-template-rows,opacity] duration-300 ${
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
                <IconInput icon={<RiBuildingLine className={iconClassName} />}>
                  <Input
                    id={companyFieldId}
                    name="companyName"
                    type="text"
                    placeholder={copy.companyNamePlaceholder}
                    autoComplete="organization"
                    required={isSignup}
                    disabled={!isSignup}
                    tabIndex={isSignup ? undefined : -1}
                    className={inputClassName}
                  />
                </IconInput>
              </Field>
            </div>
          </div>

          <Field className="denarius-auth-enter [animation-delay:120ms]">
            <FieldLabel htmlFor="email">{copy.email}</FieldLabel>
            <IconInput icon={<RiMailLine className={iconClassName} />}>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={copy.emailPlaceholder}
                autoComplete="email"
                required
                className={inputClassName}
              />
            </IconInput>
          </Field>

          <Field className="denarius-auth-enter [animation-delay:120ms]">
            <FieldLabel htmlFor="password">{copy.password}</FieldLabel>
            <IconInput
              icon={<RiKey2Line className={iconClassName} />}
              trailing={
                <button
                  type="button"
                  aria-label={
                    showPassword ? copy.hidePassword : copy.showPassword
                  }
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <RiEyeOffLine className={iconClassName} />
                  ) : (
                    <RiEyeLine className={iconClassName} />
                  )}
                </button>
              }
            >
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder={copy.passwordPlaceholder}
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={isSignup ? 8 : undefined}
                className={`${inputClassName} pr-10`}
              />
            </IconInput>
          </Field>

          {shownError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {shownError}
            </p>
          )}

          <Field className="denarius-auth-enter [animation-delay:180ms]">
            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-lg text-sm"
            >
              {pending
                ? isSignup
                  ? copy.submittingSignup
                  : copy.submittingLogin
                : isSignup
                  ? copy.submitSignup
                  : copy.submitLogin}
            </Button>
          </Field>

          <FieldSeparator className="denarius-auth-enter [animation-delay:240ms]">
            {copy.or}
          </FieldSeparator>
          <Field className="denarius-auth-enter [animation-delay:240ms]">
            <GoogleButton className="h-11 rounded-lg text-sm" />
          </Field>
        </FieldGroup>
      </form>

      <OtpDialog state={signupState} email={signupState.email ?? ""} />
    </>
  );
}
