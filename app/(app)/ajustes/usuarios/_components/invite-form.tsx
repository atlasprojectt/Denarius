"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";

import { ActionStatus } from "@/components/domain/action-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteUser, type InviteFormState } from "@/lib/invitations/actions";

const copy = {
  email: "E-mail",
  emailPlaceholder: "pessoa@empresa.com",
  role: "Papel",
  admin: "Administrador",
  adminHint: "Conecta provedores, define orçamentos e convida pessoas.",
  viewer: "Visualizador",
  viewerHint: "Vê os números agregados; nomes de pessoas ficam restritos.",
  submit: "Convidar",
  submitting: "Convidando…",
  linkTitle: "Link do convite",
  linkNotEmailed:
    "O envio de e-mail ainda não está configurado — copie o link e mande para a pessoa.",
  linkEmailed: "Também enviamos por e-mail. Guarde o link: ele não aparece de novo.",
  copy: "Copiar",
  copied: "Copiado",
};

const initialState: InviteFormState = {};

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">
        {url}
      </code>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => setCopied(true));
        }}
      >
        {copied ? (
          <RiCheckLine className="size-3.5" aria-hidden />
        ) : (
          <RiFileCopyLine className="size-3.5" aria-hidden />
        )}
        {copied ? copy.copied : copy.copy}
      </Button>
    </div>
  );
}

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteUser, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  // Controlled: form.reset() clears native fields but not the Base UI Select.
  const [role, setRole] = useState("viewer");

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-email">{copy.email}</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder={copy.emailPlaceholder}
            aria-invalid={state.fieldErrors?.email !== undefined}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-role">{copy.role}</Label>
          <Select
            name="role"
            value={role}
            onValueChange={(value) => setRole(value ?? "viewer")}
          >
            <SelectTrigger id="invite-role" className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">{copy.viewer}</SelectItem>
              <SelectItem value="admin">{copy.admin}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          loading={pending}
          loadingText={copy.submitting}
          className="min-w-28"
        >
          {copy.submit}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {role === "admin" ? copy.adminHint : copy.viewerHint}
      </p>

      {state.fieldErrors?.email && (
        <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
      )}
      <ActionStatus error={state.error} success={state.success} />

      {/* The token is hashed at rest — this render is the only chance to read
          the link, so it stays on screen until the next submit. */}
      {state.inviteUrl && (
        <div className="flex flex-col gap-1.5 rounded-lg border p-3">
          <p className="text-xs font-medium">{copy.linkTitle}</p>
          <p className="text-xs text-muted-foreground">
            {state.emailed ? copy.linkEmailed : copy.linkNotEmailed}
          </p>
          <CopyLink url={state.inviteUrl} />
        </div>
      )}
    </form>
  );
}
