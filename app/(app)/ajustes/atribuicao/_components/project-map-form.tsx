"use client";

import { useActionState, useMemo, useState } from "react";

import { ActionStatus } from "@/components/domain/action-status";
import { ActionToast } from "@/components/domain/toast-provider";
import { UsdValue } from "@/components/domain/usd-value";
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
import {
  adoptServerRows,
  baselineFromSaved,
  draftFromRows,
  isDirty,
  UNATTRIBUTED,
} from "@/lib/attribution/draft";
import { usdDisplay, type FrozenFx } from "@/lib/engine/money-model";

const copy = {
  submit: "Salvar mapeamento",
  submitting: "Salvando…",
  unattributed: "Não atribuído",
  colProject: "Projeto / workspace",
  colSpend: "Gasto derivado (mês)",
  colTeam: "Time",
  uncosted: "não precificado",
  dirty: "Há alterações não salvas.",
  unchanged: "Nenhuma alteração pendente.",
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
  currency,
  fx,
}: {
  projects: ProjectRow[];
  teams: Team[];
  currency: string;
  fx: FrozenFx | null;
}) {
  const [state, formAction, pending] = useActionState(saveProjectMap, initialState);
  const initial = useMemo(() => draftFromRows(projects), [projects]);
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(initial);

  // The baseline only advances to what the server CONFIRMED it saved — keyed
  // on the action state's identity, never on the draft (a draft-keyed effect
  // would re-baseline every later edit once one save had succeeded, locking
  // Save disabled forever). React's "adjust state during render" pattern.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.saved) setBaseline(baselineFromSaved(state.saved));
  }

  // Revalidated props may only ADD rows the client doesn't know yet; they can
  // never overwrite a confirmed or in-progress selection (QA-11 root cause).
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setBaseline((current) => adoptServerRows(current, initial));
    setDraft((current) => adoptServerRows(current, initial));
  }

  const dirty = isDirty(draft, baseline);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ActionToast id="project-map:save" state={state} success={state.success} />
      <div className="grid gap-3 md:hidden">
        {projects.map((project) => {
          const key = `${project.provider}|${project.projectId}`;
          return (
            <div key={key} className="rounded-lg border p-4">
              <input type="hidden" name="project" value={key} />
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium">{project.projectId}</span>
                <Badge variant="secondary">{providerLabel[project.provider] ?? project.provider}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                {project.uncosted ? copy.uncosted : <UsdValue value={usdDisplay(project.derivedUsd, currency, fx)} />}
              </p>
              <div className="mt-3">
                <TeamSelect
                  name={`team|${key}`}
                  teams={teams}
                  value={draft[key] ?? UNATTRIBUTED}
                  onChange={(value) => setDraft((current) => ({ ...current, [key]: value }))}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="hidden md:block">
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
                    <UsdValue value={usdDisplay(project.derivedUsd, currency, fx)} />
                  )}
                </TableCell>
                <TableCell>
                  <TeamSelect
                    name={`team|${key}`}
                    teams={teams}
                    value={draft[key] ?? UNATTRIBUTED}
                    onChange={(value) => setDraft((current) => ({ ...current, [key]: value }))}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>

      <ActionStatus error={state.error} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? copy.submitting : copy.submit}
        </Button>
        <p className="text-xs text-muted-foreground" role="status">
          {dirty ? copy.dirty : copy.unchanged}
        </p>
      </div>
    </form>
  );
}

function TeamSelect({
  name,
  teams,
  value,
  onChange,
}: {
  name: string;
  teams: Team[];
  value: string;
  onChange: (value: string) => void;
}) {
  // Native select: dozens of per-row dropdowns inside one form submit reliably
  // with zero client state; styled to match the shadcn trigger.
  return (
    <select
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
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
