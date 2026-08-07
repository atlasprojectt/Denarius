"use client";

import { useActionState, useState } from "react";
import { RiDeleteBinLine, RiDownload2Line } from "@remixicon/react";

import { ActionStatus } from "@/components/domain/action-status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteTenantAccount,
  type TenantDeletionState,
} from "@/lib/privacy/actions";

const copy = {
  title: "Seus dados",
  description:
    "Exporte uma cópia completa ou encerre definitivamente este espaço.",
  exportTitle: "Exportar dados",
  exportDescription:
    "Baixa um arquivo JSON com os dados deste espaço. Credenciais e hashes de convite nunca entram no arquivo.",
  exportAction: "Baixar exportação",
  deleteAction: "Excluir espaço",
  deleteTitle: "Excluir este espaço definitivamente?",
  deleteDescription:
    "Pessoas, times, histórico de uso, custos, orçamentos, notificações e acessos serão apagados. Esta ação não pode ser desfeita.",
  providerWarning:
    "Isto não cancela nem altera nada na OpenAI ou na Anthropic. O Denarius é somente leitura; o gasto nos provedores continua até sua empresa agir diretamente neles.",
  exportFirst:
    "Se precisar guardar uma cópia, faça a exportação antes de confirmar.",
  confirmationLabel: (name: string) => `Digite ${name} para confirmar`,
  confirmationPlaceholder: "Nome exato da empresa",
  cancel: "Cancelar",
  confirm: "Excluir tudo",
  deleting: "Excluindo…",
};

const initialState: TenantDeletionState = {};
const exportHref = "/ajustes/privacidade/exportar";

export function DataRightsPanel({ companyName }: { companyName: string }) {
  const [typedName, setTypedName] = useState("");
  const [state, action, pending] = useActionState(
    deleteTenantAccount,
    initialState,
  );
  const confirmed = typedName === companyName;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">{copy.exportTitle}</p>
            <p className="mt-0.5 text-xs/relaxed text-muted-foreground">
              {copy.exportDescription}
            </p>
          </div>
          <Button variant="secondary" asChild>
            <a href={exportHref} download>
              <RiDownload2Line aria-hidden />
              {copy.exportAction}
            </a>
          </Button>
        </div>

        <Dialog onOpenChange={(open) => !open && setTypedName("")}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="self-start">
              <RiDeleteBinLine aria-hidden />
              {copy.deleteAction}
            </Button>
          </DialogTrigger>
          <DialogContent showCloseButton={false} className="sm:max-w-md">
            <form action={action} className="contents">
              <DialogHeader>
                <DialogTitle>{copy.deleteTitle}</DialogTitle>
                <DialogDescription>{copy.deleteDescription}</DialogDescription>
              </DialogHeader>

              <p className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-xs/relaxed text-destructive">
                {copy.providerWarning}
              </p>

              <div className="rounded-lg border p-3">
                <p className="text-xs/relaxed text-muted-foreground">
                  {copy.exportFirst}
                </p>
                <Button variant="secondary" size="sm" asChild className="mt-2">
                  <a href={exportHref} download>
                    <RiDownload2Line aria-hidden />
                    {copy.exportAction}
                  </a>
                </Button>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="delete-company-name">
                  {copy.confirmationLabel(companyName)}
                </Label>
                <Input
                  id="delete-company-name"
                  name="companyName"
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                  placeholder={copy.confirmationPlaceholder}
                  autoComplete="off"
                  aria-invalid={state.error !== undefined}
                />
              </div>

              <ActionStatus error={state.error} />

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={pending}>
                    {copy.cancel}
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={!confirmed}
                  loading={pending}
                  loadingText={copy.deleting}
                >
                  {copy.confirm}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
