"use client";

import { useActionState } from "react";
import { CheckCircleIcon, DownloadSimpleIcon } from "@phosphor-icons/react";

import { ActionStatus } from "@/components/domain/action-status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { importRoster, type RosterFormState } from "@/lib/roster/actions";

const copy = {
  title: "Importar CSV",
  hint: "Colunas: name, email, team (aceita nome, email, time; vírgula ou ponto-e-vírgula).",
  template: "Baixar modelo",
  preview: "Validar arquivo",
  commit: (count: number) => `Importar ${count} pessoa(s)`,
  validating: "Validando…",
  importing: "Importando…",
  previewOk: (count: number) => `${count} linha(s) válida(s), pronto para importar.`,
  previewNewTeams: (teams: string[]) =>
    `Times novos que serão criados: ${teams.join(", ")}.`,
  previewErrors: (count: number) =>
    `${count} erro(s) — corrija o arquivo e valide de novo. Nada foi importado.`,
  errorLine: (line: number) => `Linha ${line}:`,
};

const TEMPLATE_CSV =
  "name,email,team\nAna Souza,ana@suaempresa.com,Engineering\nBruno Lima,bruno@suaempresa.com,Marketing\n";

const initialState: RosterFormState = {};

export function RosterUpload() {
  const [state, formAction, pending] = useActionState(
    importRoster,
    initialState,
  );

  const preview = state.preview;
  const canCommit = Boolean(
    preview && preview.errors.length === 0 && preview.validCount > 0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{copy.title}</CardTitle>
        <CardDescription>{copy.hint}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`}
              download="roster-modelo.csv"
            >
              <DownloadSimpleIcon className="size-3.5" />
              {copy.template}
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
          />

          <ActionStatus error={state.error} success={state.success} />

          {preview && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              {preview.errors.length > 0 ? (
                <>
                  <p role="alert" className="font-medium text-destructive">
                    {copy.previewErrors(preview.errors.length)}
                  </p>
                  <ul className="mt-2 max-h-48 list-none overflow-auto text-destructive/90">
                    {preview.errors.map((error) => (
                      <li key={`${error.line}-${error.message}`}>
                        <span className="font-medium">
                          {copy.errorLine(error.line)}
                        </span>{" "}
                        {error.message}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-1.5 font-medium">
                    <CheckCircleIcon className="size-4 shrink-0" aria-hidden />
                    {copy.previewOk(preview.validCount)}
                  </p>
                  {preview.newTeams.length > 0 && (
                    <p className="mt-1 text-muted-foreground">
                      {copy.previewNewTeams(preview.newTeams)}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex gap-2.5">
            <Button
              type="submit"
              name="intent"
              value="preview"
              variant="outline"
              disabled={pending}
            >
              {pending ? copy.validating : copy.preview}
            </Button>
            {canCommit && (
              <Button type="submit" name="intent" value="commit" disabled={pending}>
                {pending ? copy.importing : copy.commit(preview!.validCount)}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
