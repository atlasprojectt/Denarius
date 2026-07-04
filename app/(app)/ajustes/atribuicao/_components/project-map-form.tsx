"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { saveProjectMap, type ProjectMapFormState } from "@/lib/attribution/actions";
import { money } from "@/lib/money";

const copy = {
  submit: "Salvar mapeamento",
  submitting: "Salvando…",
  unattributed: "Não atribuído",
  colProject: "Projeto / workspace",
  colSpend: "Gasto derivado (mês)",
  colTeam: "Time",
  uncosted: "não precificado",
};

const providerLabel: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

type Team = { id: string; name: string };

export type ProjectRow = {
  provider: string;
  projectId: string;
  derivedUsd: number;
  uncosted: boolean;
  teamId: string | null;
};

const initialState: ProjectMapFormState = {};

export function ProjectMapForm({
  projects,
  teams,
}: {
  projects: ProjectRow[];
  teams: Team[];
}) {
  const [state, formAction, pending] = useActionState(saveProjectMap, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-2 font-medium">{copy.colProject}</th>
            <th className="py-2 pr-2 text-right font-medium">{copy.colSpend}</th>
            <th className="py-2 pl-2 font-medium">{copy.colTeam}</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const key = `${project.provider}|${project.projectId}`;
            return (
              <tr key={key} className="border-b last:border-b-0 align-middle">
                <td className="py-2.5 pr-2">
                  <input type="hidden" name="project" value={key} />
                  <span className="font-medium">{project.projectId}</span>
                  <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {providerLabel[project.provider] ?? project.provider}
                  </span>
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums">
                  {project.uncosted ? (
                    <span className="text-muted-foreground">{copy.uncosted}</span>
                  ) : (
                    money(project.derivedUsd, "USD")
                  )}
                </td>
                <td className="py-2.5 pl-2">
                  <select
                    name={`team|${key}`}
                    defaultValue={project.teamId ?? ""}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">{copy.unattributed}</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm font-medium text-green-700">
          {state.success}
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? copy.submitting : copy.submit}
        </Button>
      </div>
    </form>
  );
}
