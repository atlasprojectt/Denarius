"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <tr className="border-b last:border-b-0">
        <td className="py-2.5 pr-2 font-medium">{employee.name}</td>
        <td className="py-2.5 pr-2 text-muted-foreground">{employee.email}</td>
        <td className="py-2.5 pr-2">{employee.teamName}</td>
        <td className="py-2.5 text-right">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            {copy.edit}
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b bg-muted/30">
      <td colSpan={4} className="py-3">
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="employeeId" value={employee.id} />
          <Input
            name="name"
            defaultValue={employee.name}
            required
            className="h-9 w-56 bg-background"
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
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
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
      </td>
    </tr>
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
    <div className="mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-2 font-medium">{copy.name}</th>
            <th className="py-2 pr-2 font-medium">{copy.email}</th>
            <th className="py-2 pr-2 font-medium">{copy.team}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <EmployeeRow key={employee.id} employee={employee} teams={teams} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
