"use client";

import { useActionState, useState } from "react";

import { ActionStatus } from "@/components/domain/action-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateEmployee, type RosterFormState } from "@/lib/roster/actions";

const copy = {
  name: "Nome",
  email: "E-mail",
  team: "Time",
  edit: "Editar",
  save: "Salvar",
  saving: "Salvando…",
  cancel: "Cancelar",
};

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
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="bg-muted/30">
      <TableCell colSpan={4} className="py-3 whitespace-normal">
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="employeeId" value={employee.id} />
          <Input
            name="name"
            defaultValue={employee.name}
            required
            className="h-8 w-56 bg-background"
          />
          <span className="text-sm text-muted-foreground">
            {employee.email}
          </span>
          <select
            name="teamId"
            required
            defaultValue={
              teams.find((team) => team.name === employee.teamName)?.id ?? ""
            }
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
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

export function EmployeeTable({
  employees,
  teams,
}: {
  employees: Employee[];
  teams: Team[];
}) {
  return (
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
        {employees.map((employee) => (
          <EmployeeRow key={employee.id} employee={employee} teams={teams} />
        ))}
      </TableBody>
    </Table>
  );
}
