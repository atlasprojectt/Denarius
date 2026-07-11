import { IconUsersGroup } from "@tabler/icons-react";

import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/domain/page-header";
import { PageContainer } from "@/components/domain/page-container";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { listTeams } from "@/lib/teams/queries";

import { EmployeeTable } from "./_components/employee-table";
import { RosterUpload } from "./_components/roster-upload";

const copy = {
  back: "Ajustes",
  title: "Roster",
  subtitle:
    "A lista de funcionários e times — a base da atribuição de gasto por time e pessoa.",
  emptyTitle: "Nenhum funcionário importado ainda",
  emptyBody:
    "Suba um CSV com as colunas name, email e team (ou nome, email, time). Vírgula ou ponto-e-vírgula funcionam; quem não estiver no arquivo em reimportações é mantido.",
  peopleTitle: "Pessoas",
  peopleSub: (n: number) => `${n} pessoa(s) no roster.`,
};

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  team: { name: string } | null;
};

export default async function RosterPage() {
  const supabase = await createClient();

  const [{ data: employeesData }, teams] = await Promise.all([
    supabase
      .from("employee")
      .select("id, name, email, team:team_id(name)")
      .order("name"),
    listTeams(),
  ]);
  const employees = (employeesData ?? []) as unknown as EmployeeRow[];

  return (
    <PageContainer variant="wide" className="gap-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        backHref="/ajustes"
        backLabel={copy.back}
      />

      <RosterUpload />

      {employees.length === 0 ? (
        <EmptyState
          icon={<IconUsersGroup />}
          title={copy.emptyTitle}
          description={copy.emptyBody}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{copy.peopleTitle}</CardTitle>
            <CardDescription>{copy.peopleSub(employees.length)}</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeTable
              employees={employees.map((employee) => ({
                id: employee.id,
                name: employee.name,
                email: employee.email,
                teamName: employee.team?.name ?? "—",
              }))}
              teams={teams}
            />
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
