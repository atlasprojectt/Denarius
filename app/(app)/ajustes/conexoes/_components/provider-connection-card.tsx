"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { utcStamp } from "@/lib/format";
import {
  revokeAnthropicKey,
  revokeOpenAIKey,
  saveAnthropicKey,
  saveOpenAIKey,
  syncAnthropicNow,
  syncOpenAINow,
  type ConnectionFormState,
} from "@/lib/providers/actions";

type Provider = "openai" | "anthropic";

const sharedCopy = {
  notConnected: "Não conectado",
  active: "Ativo",
  error: "Erro na sincronização",
  revoked: "Revogado",
  lastSync: (stamp: string) => `Última sincronização: ${stamp}`,
  neverSynced: "Nunca sincronizado",
  keyLabel: "Admin Key (somente leitura)",
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

const providerCopy: Record<
  Provider,
  { title: string; keyPlaceholder: string; keyHelp: string; groupingTip: string }
> = {
  openai: {
    title: "OpenAI",
    keyPlaceholder: "sk-admin…",
    keyHelp:
      "Crie uma Admin Key somente-leitura no painel da organização OpenAI. Ela é criptografada em repouso e nunca aparece em logs.",
    groupingTip:
      "Dica: crie um projeto OpenAI por time — os custos em dólar saem por projeto, então isso dá o custo exato por time.",
  },
  anthropic: {
    title: "Anthropic",
    keyPlaceholder: "sk-ant-admin…",
    keyHelp:
      "Crie uma Admin Key no Console da Anthropic (Settings → Admin keys). Ela é criptografada em repouso e nunca aparece em logs.",
    groupingTip:
      "Dica: crie um workspace Anthropic por time — os custos em dólar saem por workspace, então isso dá o custo exato por time.",
  },
};

const providerActions: Record<
  Provider,
  {
    save: typeof saveOpenAIKey;
    sync: typeof syncOpenAINow;
    revoke: typeof revokeOpenAIKey;
  }
> = {
  openai: { save: saveOpenAIKey, sync: syncOpenAINow, revoke: revokeOpenAIKey },
  anthropic: {
    save: saveAnthropicKey,
    sync: syncAnthropicNow,
    revoke: revokeAnthropicKey,
  },
};

const initialState: ConnectionFormState = {};

function statusLabel(status: string | null): string {
  if (status === "active") return sharedCopy.active;
  if (status === "error") return sharedCopy.error;
  if (status === "revoked") return sharedCopy.revoked;
  return sharedCopy.notConnected;
}

type KeyFormProps = {
  provider: Provider;
  formAction: (formData: FormData) => void;
  pending: boolean;
};

function KeyForm({ provider, formAction, pending }: KeyFormProps) {
  const copy = providerCopy[provider];
  const inputId = `adminKey-${provider}`;
  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={inputId}>{sharedCopy.keyLabel}</Label>
        <Input
          id={inputId}
          name="adminKey"
          type="password"
          placeholder={copy.keyPlaceholder}
          autoComplete="off"
          required
        />
        <p className="text-xs text-muted-foreground">{copy.keyHelp}</p>
        <p className="text-xs text-muted-foreground">{copy.groupingTip}</p>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? sharedCopy.connecting : sharedCopy.connect}
        </Button>
      </div>
    </form>
  );
}

function ActiveControls({ keyForm }: { keyForm: KeyFormProps }) {
  const actions = providerActions[keyForm.provider];
  const [syncState, syncAction, syncing] = useActionState(
    actions.sync,
    initialState,
  );
  const [revokeState, revokeAction, revoking] = useActionState(
    actions.revoke,
    initialState,
  );
  const [rotating, setRotating] = useState(false);

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <form action={syncAction}>
          <Button type="submit" variant="outline" size="sm" disabled={syncing}>
            {syncing ? sharedCopy.syncing : sharedCopy.syncNow}
          </Button>
        </form>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRotating((value) => !value)}
        >
          {rotating ? sharedCopy.cancelRotate : sharedCopy.rotate}
        </Button>
        <form action={revokeAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={revoking}
            className="text-destructive hover:text-destructive"
            onClick={(event) => {
              if (!confirm(sharedCopy.confirmRevoke)) event.preventDefault();
            }}
          >
            {revoking ? sharedCopy.revoking : sharedCopy.revoke}
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

export function ProviderConnectionCard({
  provider,
  status,
  lastSyncAt,
  lastSyncError,
}: {
  provider: Provider;
  status: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}) {
  // Save state lives on the card, not inside the form: connecting flips the
  // card into its connected layout (the form unmounts), and the "we found
  // $X this month" message must survive that swap.
  const [saveState, saveAction, savePending] = useActionState(
    providerActions[provider].save,
    initialState,
  );
  const keyForm: KeyFormProps = {
    provider,
    formAction: saveAction,
    pending: savePending,
  };

  const connected = status === "active" || status === "error";
  const stamp = lastSyncAt ? utcStamp(lastSyncAt) : null;

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold">{providerCopy[provider].title}</h2>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          {statusLabel(status)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {stamp ? sharedCopy.lastSync(stamp) : sharedCopy.neverSynced}
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
