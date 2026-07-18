"use client";

import { useActionState, useState } from "react";
import { RiLightbulbLine } from "@remixicon/react";

import { ActionStatus } from "@/components/domain/action-status";
import { ConfirmationDialog } from "@/components/domain/confirmation-dialog";
import { ProviderIcon } from "@/components/domain/provider-icon";
import { ActionToast } from "@/components/domain/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  revokeTitle: "Revogar conexão?",
  confirmRevoke: "A chave será descartada e o uso deixará de sincronizar. O histórico já importado permanece disponível.",
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

function StatusBadge({ status }: { status: string | null }) {
  // Neutral chrome — connection state is data quality, not budget status, so it
  // never wears the semaphore (product principle #5).
  return (
    <Badge variant={status === "active" ? "secondary" : "outline"}>
      {statusLabel(status)}
    </Badge>
  );
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
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={inputId}>{sharedCopy.keyLabel}</Label>
        <Input
          id={inputId}
          name="adminKey"
          type="password"
          placeholder={copy.keyPlaceholder}
          autoComplete="off"
          required
          className="max-w-md font-mono"
        />
        <p className="text-xs/relaxed text-muted-foreground">{copy.keyHelp}</p>
      </div>
      <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs/relaxed text-muted-foreground">
        <RiLightbulbLine className="mt-0.5 size-4 shrink-0" aria-hidden />
        {copy.groupingTip}
      </p>
      <div>
        <Button type="submit" loading={pending} loadingText={sharedCopy.connecting}>
          {sharedCopy.connect}
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <form action={syncAction}>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={syncing}
            loadingText={sharedCopy.syncing}
          >
            {sharedCopy.syncNow}
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
        <ConfirmationDialog
          trigger={<Button type="button" variant="destructive" size="sm">{sharedCopy.revoke}</Button>}
          title={sharedCopy.revokeTitle}
          description={sharedCopy.confirmRevoke}
          confirmLabel={sharedCopy.revoke}
          pendingLabel={sharedCopy.revoking}
          action={revokeAction}
          pending={revoking}
          success={revokeState.success}
        />
      </div>
      <ActionToast id={`${keyForm.provider}:sync`} state={syncState} error={syncState.error} success={syncState.success} />
      <ActionToast id={`${keyForm.provider}:revoke`} state={revokeState} error={revokeState.error} success={revokeState.success} />
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ProviderIcon provider={provider} className="size-4 shrink-0" />
          {providerCopy[provider].title}
        </CardTitle>
        <CardDescription className="tabular-nums">
          {stamp ? sharedCopy.lastSync(stamp) : sharedCopy.neverSynced}
        </CardDescription>
        <CardAction>
          <StatusBadge status={status} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status === "error" && lastSyncError && (
          <ActionStatus error={lastSyncError} />
        )}
        <ActionStatus error={saveState.error} success={saveState.success} />
        {connected ? <ActiveControls keyForm={keyForm} /> : <KeyForm {...keyForm} />}
      </CardContent>
    </Card>
  );
}
