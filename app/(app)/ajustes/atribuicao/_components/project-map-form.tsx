"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/domain/action-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// The radix Select can't submit an empty-string value, so "Não atribuído" is a
// sentinel the server action already treats as "no team".
const UNATTRIBUTED = "";

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{copy.colProject}</TableHead>
            <TableHead className="text-right">{copy.colSpend}</TableHead>
            <TableHead className="w-56">{copy.colTeam}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const key = `${project.provider}|${project.projectId}`;
            return (
              <TableRow key={key}>
                <TableCell>
                  <input type="hidden" name="project" value={key} />
                  <span className="font-medium">{project.projectId}</span>
                  <Badge variant="secondary" className="ml-2">
                    {providerLabel[project.provider] ?? project.provider}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {project.uncosted ? (
                    <span className="text-muted-foreground">{copy.uncosted}</span>
                  ) : (
                    money(project.derivedUsd, "USD")
                  )}
                </TableCell>
                <TableCell>
                  <TeamSelect
                    name={`team|${key}`}
                    teams={teams}
                    defaultTeamId={project.teamId}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <ActionStatus error={state.error} success={state.success} />

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? copy.submitting : copy.submit}
        </Button>
      </div>
    </form>
  );
}

function TeamSelect({
  name,
  teams,
  defaultTeamId,
}: {
  name: string;
  teams: Team[];
  defaultTeamId: string | null;
}) {
  // Native select: dozens of per-row dropdowns inside one form submit reliably
  // with zero client state; styled to match the shadcn trigger.
  return (
    <select
      name={name}
      defaultValue={defaultTeamId ?? UNATTRIBUTED}
      className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30"
    >
      <option value={UNATTRIBUTED}>{copy.unattributed}</option>
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}
