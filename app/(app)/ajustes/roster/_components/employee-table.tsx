"use client";

import { useActionState, useMemo, useState } from "react";
import { RiSearchLine } from "@remixicon/react";

import { ActionStatus } from "@/components/domain/action-status";
import { ConfirmationDialog } from "@/components/domain/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  removeEmployee,
  updateEmployee,
  type RosterFormState,
} from "@/lib/roster/actions";

const copy = {
  name: "Nome",
  email: "E-mail",
  team: "Time",
  edit: "Editar",
  save: "Salvar",
  saving: "Salvando…",
  cancel: "Cancelar",
  emailHint:
    "O e-mail é a identidade de importação do CSV — um novo import usa o e-mail atualizado.",
  remove: "Remover",
  removing: "Removendo…",
  removeTitle: (name: string) => `Remover ${name} do roster?`,
  removeBody:
    "A pessoa sai da lista e da contagem de assentos. O gasto histórico do time não muda — ele é atribuído por projeto/workspace, não por pessoa.",
  search: "Buscar por nome, e-mail ou time",
  noResults: "Nenhuma pessoa corresponde à busca.",
  previous: "Anterior",
  next: "Próxima",
  page: (current: number, total: number) => `Página ${current} de ${total}`,
};

const PAGE_SIZE = 25;

type Employee = { id: string; name: string; email: string; teamName: string };
type Team = { id: string; name: string };

const initialState: RosterFormState = {};

function EmployeeRow({
  employee,
  teams,
}: {
  employee: Employee;
  teams: Team[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateEmployee,
    initialState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeEmployee,
    initialState,
  );

  // Close the editor when a save lands (React's "adjust state during render"
  // pattern — the action returns a fresh state object on every dispatch).
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setEditing(false);
  }

  if (!editing) {
    return (
      <TableRow>
        <TableCell className="font-medium">{employee.name}</TableCell>
        <TableCell className="text-muted-foreground">{employee.email}</TableCell>
        <TableCell>{employee.teamName}</TableCell>
        <TableCell className="text-right">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            {copy.edit}
          </Button>
          <ConfirmationDialog
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                {copy.remove}
              </Button>
            }
            title={copy.removeTitle(employee.name)}
            description={copy.removeBody}
            confirmLabel={copy.remove}
            pendingLabel={copy.removing}
            action={removeAction}
            pending={removing}
            success={removeState.success}
          >
            <input type="hidden" name="employeeId" value={employee.id} />
            <ActionStatus error={removeState.error} />
          </ConfirmationDialog>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="bg-muted/30">
      <TableCell colSpan={4} className="py-3 whitespace-normal">
        <form action={formAction} noValidate className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="employeeId" value={employee.id} />
          <Input
            name="name"
            defaultValue={employee.name}
            aria-invalid={state.fieldErrors?.name !== undefined}
            className="h-8 w-56 bg-background"
          />
          <div className="flex flex-col gap-1">
            <Input
              name="email"
              type="email"
              defaultValue={employee.email}
              aria-invalid={state.fieldErrors?.email !== undefined}
              className="h-8 w-64 bg-background"
            />
            {state.fieldErrors?.email && (
              <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
            )}
          </div>
          <Select
            name="teamId"
            required
            items={Object.fromEntries(teams.map((t) => [t.id, t.name]))}
            defaultValue={
              teams.find((team) => team.name === employee.teamName)?.id ?? ""
            }
          >
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="w-full text-xs text-muted-foreground">{copy.emailHint}</p>
          <ActionStatus error={state.error} />
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              {copy.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? copy.saving : copy.save}
            </Button>
          </div>
        </form>
      </TableCell>
    </TableRow>
  );
}

function MobileEmployeeCard({ employee, teams }: { employee: Employee; teams: Team[] }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateEmployee, initialState);
  const [removeState, removeAction, removing] = useActionState(removeEmployee, initialState);

  if (!editing) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{employee.name}</p>
            <p className="mt-0.5 break-all text-xs text-muted-foreground">{employee.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">{employee.teamName}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
              {copy.edit}
            </Button>
            <ConfirmationDialog
              trigger={<Button type="button" variant="destructive" size="sm">{copy.remove}</Button>}
              title={copy.removeTitle(employee.name)}
              description={copy.removeBody}
              confirmLabel={copy.remove}
              pendingLabel={copy.removing}
              action={removeAction}
              pending={removing}
              success={removeState.success}
            >
              <input type="hidden" name="employeeId" value={employee.id} />
              <ActionStatus error={removeState.error} />
            </ConfirmationDialog>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
      <input type="hidden" name="employeeId" value={employee.id} />
      <Input name="name" defaultValue={employee.name} aria-invalid={state.fieldErrors?.name !== undefined} />
      <Input name="email" type="email" defaultValue={employee.email} aria-invalid={state.fieldErrors?.email !== undefined} />
      <Select
        name="teamId"
        required
        items={Object.fromEntries(teams.map((t) => [t.id, t.name]))}
        defaultValue={teams.find((team) => team.name === employee.teamName)?.id ?? ""}
      >
        <SelectTrigger className="h-8 w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <ActionStatus error={state.error} success={state.success} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>{copy.cancel}</Button>
        <Button type="submit" size="sm" disabled={pending}>{pending ? copy.saving : copy.save}</Button>
      </div>
    </form>
  );
}

export function EmployeeTable({
  employees,
  teams,
}: {
  employees: Employee[];
  teams: Team[];
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return employees;
    return employees.filter((employee) =>
      [employee.name, employee.email, employee.teamName].some((value) =>
        value.toLocaleLowerCase("pt-BR").includes(normalized),
      ),
    );
  }, [employees, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      {employees.length > 10 && (
        <label className="relative block max-w-sm">
          <span className="sr-only">{copy.search}</span>
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={copy.search}
            className="pl-9"
          />
        </label>
      )}

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
          {copy.noResults}
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {visible.map((employee) => (
              <MobileEmployeeCard key={employee.id} employee={employee} teams={teams} />
            ))}
          </div>

          <div className="hidden md:block">
          <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{copy.name}</TableHead>
          <TableHead>{copy.email}</TableHead>
          <TableHead>{copy.team}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((employee) => (
          <EmployeeRow key={employee.id} employee={employee} teams={teams} />
        ))}
      </TableBody>
    </Table>
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground tabular-nums">{copy.page(safePage, totalPages)}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              {copy.previous}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
              {copy.next}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
