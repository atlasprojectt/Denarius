"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { utcStamp } from "@/lib/format";
import {
  revokeOpenAIKey,
  saveOpenAIKey,
  syncOpenAINow,
  type ConnectionFormState,
} from "@/lib/providers/actions";

const copy = {
  title: "OpenAI",
  notConnected: "Não conectado",
  active: "Ativo",
  error: "Erro na sincronização",
  revoked: "Revogado",
  lastSync: (stamp: string) => `Última sincronização: ${stamp}`,
  neverSynced: "Nunca sincronizado",
  keyLabel: "Admin Key (somente leitura)",
  keyPlaceholder: "sk-admin…",
  keyHelp:
    "Crie uma Admin Key somente-leitura no painel da organização OpenAI. Ela é criptografada em repouso e nunca aparece em logs.",
  projectTip:
    "Dica: crie um projeto OpenAI por time — os custos em dólar saem por projeto, então isso dá o custo exato por time.",
  connect: "Conectar e sincronizar",
  connecting: "Testando e sincronizando…",
  rotate: "Trocar chave",
  cancelRotate: "Cancelar",
  syncNow: "Sincronizar agora",
  syncing: "Sincronizando…",
  revoke: "Revogar",
  revoking: "Revogando…",
  confirmRevoke:
    "Revogar a conexão? A chave será descartada e o uso deixará de sincronizar.",
};

const initialState: ConnectionFormState = {};

function statusLabel(status: string | null): string {
  if (status === "active") return copy.active;
  if (status === "error") return copy.error;
  if (status === "revoked") return copy.revoked;
  return copy.notConnected;
}

type KeyFormProps = {
  formAction: (formData: FormData) => void;
  pending: boolean;
};

function KeyForm({ formAction, pending }: KeyFormProps) {
  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="adminKey">{copy.keyLabel}</Label>
        <Input
          id="adminKey"
          name="adminKey"
          type="password"
          placeholder={copy.keyPlaceholder}
          autoComplete="off"
          required
        />
        <p className="text-xs text-muted-foreground">{copy.keyHelp}</p>
        <p className="text-xs text-muted-foreground">{copy.projectTip}</p>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? copy.connecting : copy.connect}
        </Button>
      </div>
    </form>
  );
}

function ActiveControls({ keyForm }: { keyForm: KeyFormProps }) {
  const [syncState, syncAction, syncing] = useActionState(
    syncOpenAINow,
    initialState,
  );
  const [revokeState, revokeAction, revoking] = useActionState(
    revokeOpenAIKey,
    initialState,
  );
  const [rotating, setRotating] = useState(false);

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <form action={syncAction}>
          <Button type="submit" variant="outline" size="sm" disabled={syncing}>
            {syncing ? copy.syncing : copy.syncNow}
          </Button>
        </form>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRotating((value) => !value)}
        >
          {rotating ? copy.cancelRotate : copy.rotate}
        </Button>
        <form action={revokeAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={revoking}
            className="text-destructive hover:text-destructive"
            onClick={(event) => {
              if (!confirm(copy.confirmRevoke)) event.preventDefault();
            }}
          >
            {revoking ? copy.revoking : copy.revoke}
          </Button>
        </form>
      </div>
      {(syncState.error ?? revokeState.error) && (
        <p role="alert" className="text-sm text-destructive">
          {syncState.error ?? revokeState.error}
        </p>
      )}
      {syncState.success && (
        <p role="status" className="text-sm font-medium text-foreground">
          {syncState.success}
        </p>
      )}
      {rotating && <KeyForm {...keyForm} />}
    </div>
  );
}

export function OpenAIConnectionCard({
  status,
  lastSyncAt,
  lastSyncError,
}: {
  status: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}) {
  // Save state lives on the card, not inside the form: connecting flips the
  // card into its connected layout (the form unmounts), and the "we found
  // $X this month" message must survive that swap.
  const [saveState, saveAction, savePending] = useActionState(
    saveOpenAIKey,
    initialState,
  );
  const keyForm: KeyFormProps = { formAction: saveAction, pending: savePending };

  const connected = status === "active" || status === "error";
  const stamp = lastSyncAt ? utcStamp(lastSyncAt) : null;

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold">{copy.title}</h2>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          {statusLabel(status)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {stamp ? copy.lastSync(stamp) : copy.neverSynced}
      </p>
      {status === "error" && lastSyncError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {lastSyncError}
        </p>
      )}
      {saveState.error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {saveState.error}
        </p>
      )}
      {saveState.success && (
        <p role="status" className="mt-2 text-sm font-medium text-foreground">
          {saveState.success}
        </p>
      )}

      {connected ? <ActiveControls keyForm={keyForm} /> : <KeyForm {...keyForm} />}
    </section>
  );
}
