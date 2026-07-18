"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/domain/action-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateCompanyName,
  type SettingsFormState,
} from "@/lib/settings/actions";

const copy = {
  companyName: "Nome da empresa",
  save: "Salvar",
  saving: "Salvando…",
  adminOnly: "Somente administradores podem alterar o nome da empresa.",
};

const initialState: SettingsFormState = {};

export function CompanyForm({
  companyName,
  isAdmin,
}: {
  companyName: string;
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateCompanyName,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="companyName">{copy.companyName}</Label>
        <Input
          id="companyName"
          name="companyName"
          required
          minLength={2}
          maxLength={80}
          defaultValue={companyName}
          disabled={!isAdmin}
          className="max-w-sm"
        />
      </div>

      {isAdmin ? (
        <div className="flex items-center gap-3">
          <Button type="submit" loading={pending} loadingText={copy.saving}>
            {copy.save}
          </Button>
          <ActionStatus error={state.error} success={state.success} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{copy.adminOnly}</p>
      )}
    </form>
  );
}
