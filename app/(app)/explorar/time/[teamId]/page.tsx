import Link from "next/link";
import { notFound } from "next/navigation";
import { IconLock, IconUsersGroup } from "@tabler/icons-react";

import { EmptyState } from "@/components/domain/empty-state";
import { SimulateDrawer } from "@/components/domain/simulate-drawer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { findCockpitTeam } from "@/lib/engine/cockpit";
import { currentPeriod } from "@/lib/engine/period";
import { getCockpitData } from "@/lib/home/queries";
import { money } from "@/lib/money";
import { teamDetail } from "@/lib/usage/attribution";

const copy = {
  explore: "Explorar",
  adminOnlyTitle: "Detalhe restrito a administradores",
  adminOnlyBody:
    "O custo por pessoa é visível apenas para administradores — controle, não vigilância. O gasto agregado do time continua disponível em Explorar.",
  adminOnlyCta: "Voltar para Explorar",
  asOf: (label: string, day: number, days: number) =>
    `${label}, dia ${day} de ${days}`,
  personTitle: "Custo por pessoa",
  personSub:
    "Contribuintes deste time neste mês. Chaves compartilhadas ficam no time, nunca em uma pessoa.",
  namesHiddenNote:
    "Nomes ocultos pela política de privacidade — os contribuintes aparecem anonimizados.",
  emptyTitle: "Nenhum uso atribuído a este time ainda",
  emptyBody:
    "O gasto de API é atribuído por projeto ou workspace. Mapeie um projeto para este time em Ajustes → Atribuição para ver os contribuintes aqui.",
  emptyCta: "Ir para Atribuição",
  colPerson: "Pessoa / chave",
  colTokens: "Tokens",
  colDerived: "Gasto derivado",
  sharedKey: "Chave compartilhada",
  uncosted: "não precificado",
  total: "Total do time",
  uncostedNote:
    "Modelos sem preço aparecem como “não precificado” em vez de sumir do total. Valores em US$.",
};

const compactTokens = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function Crumbs({ current }: { current: string }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/explorar">{copy.explore}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  // Per-person cost is names/ids in context — Admin-only (product principle #1).
  const auth = await requireAdmin();
  if (auth.error !== undefined) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Crumbs current={copy.adminOnlyTitle} />
        <EmptyState
          icon={<IconLock />}
          title={copy.adminOnlyTitle}
          description={copy.adminOnlyBody}
          primaryAction={<Link href="/explorar">{copy.adminOnlyCta}</Link>}
        />
      </div>
    );
  }

  const [detail, { cockpit }] = await Promise.all([
    teamDetail(teamId),
    getCockpitData(),
  ]);
  if (!detail.found) notFound();

  const period = currentPeriod();

  // [Simular] in context (#21): pre-loaded with this team's budget evaluation.
  // Only budgeted teams have a scenario to run against.
  const cockpitTeam =
    cockpit.state === "ready" ? findCockpitTeam(cockpit, teamId) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Crumbs current={detail.teamName} />

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {detail.teamName}
          </h1>
          <p className="mt-1 max-w-2xl text-sm/relaxed text-muted-foreground">
            {copy.personSub}
          </p>
        </div>
        {cockpit.state === "ready" && cockpitTeam && (
          <SimulateDrawer
            teamName={cockpitTeam.teamName}
            currency={cockpit.currency}
            team={{
              spent: cockpitTeam.evaluation.spent,
              projection: cockpitTeam.evaluation.projection,
              budget: cockpitTeam.evaluation.budget,
            }}
            org={{
              projection: cockpit.org.projection,
              budget: cockpit.org.budget,
            }}
          />
        )}
      </header>

      {detail.persons.length === 0 ? (
        <EmptyState
          icon={<IconUsersGroup />}
          title={copy.emptyTitle}
          description={copy.emptyBody}
          primaryAction={<Link href="/ajustes/atribuicao">{copy.emptyCta}</Link>}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{copy.personTitle}</CardTitle>
            {detail.namesHidden && detail.persons.some((p) => !p.isShared) && (
              <CardDescription>{copy.namesHiddenNote}</CardDescription>
            )}
            <div className="text-xs text-muted-foreground tabular-nums">
              {copy.asOf(period.monthLabel, period.dayOfPeriod, period.daysInPeriod)}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.colPerson}</TableHead>
                  <TableHead className="text-right">{copy.colTokens}</TableHead>
                  <TableHead className="text-right">{copy.colDerived}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.persons.map((person) => (
                  <TableRow key={person.userId || "__shared__"}>
                    <TableCell className="font-medium">
                      {person.isShared ? (
                        <span className="text-muted-foreground">
                          {copy.sharedKey}
                        </span>
                      ) : (
                        person.userId
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {compactTokens.format(
                        person.inputTokens + person.outputTokens,
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {person.uncosted && person.derivedUsd === 0 ? (
                        <span className="text-muted-foreground">
                          {copy.uncosted}
                        </span>
                      ) : (
                        money(person.derivedUsd, "USD")
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>{copy.total}</TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums">
                    {money(detail.totalUsd, "USD")}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
          {detail.hasUncosted && (
            <CardFooter className="text-xs/relaxed text-muted-foreground">
              <p>{copy.uncostedNote}</p>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}
