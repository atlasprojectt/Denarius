"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { completeOnboarding, type AuthFormState } from "@/lib/auth/actions";

import { setupCopy } from "../copy";

const copy = setupCopy.company;

const initialState: AuthFormState = {};

export function CompanyStep({
  defaultCompanyName,
}: {
  defaultCompanyName: string;
}) {
  const [state, formAction, pending] = useActionState(
    completeOnboarding,
    initialState,
  );

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="companyName">{copy.field}</FieldLabel>
          <Input
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            defaultValue={defaultCompanyName}
            required
            autoFocus
            className="bg-background"
          />
          <FieldDescription>{copy.hint}</FieldDescription>
        </Field>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" loading={pending} loadingText={copy.submitting}>
            {copy.submit}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
