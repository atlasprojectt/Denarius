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
import { signup, type AuthFormState } from "@/lib/auth/actions";

import { GoogleButton } from "./google-button";

const copy = {
  title: "Criar conta",
  subtitle: "Comece a governar o gasto de IA da sua empresa",
  company: "Nome da empresa",
  companyHint: "Cria o espaço da sua empresa no Denarius.",
  email: "E-mail",
  password: "Senha",
  passwordHint: "Mínimo de 8 caracteres.",
  submit: "Criar conta",
  submitting: "Criando…",
  or: "ou",
  hasAccount: "Já tem conta?",
  loginLink: "Entrar",
};

const initialState: AuthFormState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);

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
          <FieldLabel htmlFor="companyName">{copy.company}</FieldLabel>
          <Input
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            required
            className="bg-background"
          />
          <FieldDescription>{copy.companyHint}</FieldDescription>
        </Field>
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
            autoComplete="new-password"
            minLength={8}
            required
            className="bg-background"
          />
          <FieldDescription>{copy.passwordHint}</FieldDescription>
        </Field>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.notice && (
          <p role="status" className="text-sm text-muted-foreground">
            {state.notice}
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
            {copy.hasAccount}{" "}
            <Link href="/login" className="underline underline-offset-4">
              {copy.loginLink}
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
