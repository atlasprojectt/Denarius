"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login, type AuthFormState } from "@/lib/auth/actions";

import { GoogleButton } from "./google-button";

const copy = {
  title: "Entrar no Denarius",
  subtitle: "Governança do gasto de IA da sua empresa",
  email: "E-mail",
  password: "Senha",
  submit: "Entrar",
  submitting: "Entrando…",
  or: "ou",
  noAccount: "Não tem conta?",
  signupLink: "Criar conta",
};

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {copy.subtitle}
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">{copy.email}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="bg-background"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">{copy.password}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="bg-background"
          />
        </Field>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? copy.submitting : copy.submit}
          </Button>
        </Field>
        <FieldSeparator>{copy.or}</FieldSeparator>
        <Field>
          <GoogleButton />
          <FieldDescription className="text-center">
            {copy.noAccount}{" "}
            <Link href="/signup" className="underline underline-offset-4">
              {copy.signupLink}
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
