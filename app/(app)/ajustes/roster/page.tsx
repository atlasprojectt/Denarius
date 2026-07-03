import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { EmployeeTable } from "./_components/employee-table";
import { RosterUpload } from "./_components/roster-upload";

const copy = {
  back: "← Ajustes",
  title: "Roster",
  subtitle:
    "A lista de funcionários e times — a base da atribuição de gasto por time e pessoa.",
  emptyTitle: "Nenhum funcionário importado ainda",
  emptyBody:
    "Suba um CSV com as colunas name, email e team (ou nome, email, time). Vírgula ou ponto-e-vírgula funcionam; quem não estiver no arquivo em reimportações é mantido.",
  peopleTitle: "Pessoas",
};

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  team: { name: string } | null;
};
type TeamRow = { id: string; name: string };

export default async function RosterPage() {
  const supabase = await createClient();

  const [{ data: employeesData }, { data: teamsData }] = await Promise.all([
    supabase
      .from("employee")
      .select("id, name, email, team:team_id(name)")
      .order("name"),
    supabase
      .from("team")
      .select("id, name")
      .eq("is_unattributed", false)
      .order("name"),
  ]);
  const employees = (employeesData ?? []) as unknown as EmployeeRow[];
  const teams = (teamsData ?? []) as TeamRow[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/ajustes"
          className="text-sm text-muted-foreground hover:underline"
        >
          {copy.back}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {copy.title}
        </h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <RosterUpload />

      {employees.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card p-10 text-center">
          <p className="font-medium">{copy.emptyTitle}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {copy.emptyBody}
          </p>
        </div>
      ) : (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold">
            {copy.peopleTitle}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({employees.length})
            </span>
          </h2>
          <EmployeeTable
            employees={employees.map((employee) => ({
              id: employee.id,
              name: employee.name,
              email: employee.email,
              teamName: employee.team?.name ?? "—",
            }))}
            teams={teams}
          />
        </section>
      )}
    </div>
  );
}
