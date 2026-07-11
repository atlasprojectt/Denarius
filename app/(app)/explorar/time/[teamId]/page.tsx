import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowRight, IconLock, IconUsersGroup } from "@tabler/icons-react";

import { BudgetBar } from "@/components/domain/budget-bar";
import { EmptyState } from "@/components/domain/empty-state";
import { PageContainer } from "@/components/domain/page-container";
import { SimulateDrawer } from "@/components/domain/simulate-drawer";
import { StatusPill } from "@/components/domain/status-pill";
import { UsdValue } from "@/components/domain/usd-value";
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
import { attributeSeats } from "@/lib/engine/accrual";
import { findCockpitTeam, type CockpitTeam } from "@/lib/engine/cockpit";
import { buildCumulativeSpend } from "@/lib/engine/cumulative";
import {
  costBridge,
  usdDisplay,
  type CostBridge,
} from "@/lib/engine/money-model";
import { currentPeriod } from "@/lib/engine/period";
import { getCockpitData } from "@/lib/home/queries";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { listSubscriptions } from "@/lib/subscriptions/queries";
import { teamDailyApiUsd, teamDetail } from "@/lib/usage/attribution";
import { CumulativeChart } from "./_components/cumulative-chart";

const copy = {
  explore: "Explorar",
  adminOnlyTitle: "Detalhe restrito a administradores",
  adminOnlyBody:
    "O custo por pessoa é visível apenas para administradores — controle, não vigilância. O gasto agregado do time continua disponível em Explorar.",
  adminOnlyCta: "Voltar para Explorar",
  subtitle:
    "Orçamento, plano de contenção e contribuintes deste time no período.",
  asOf: (label: string, day: number, days: number) =>
    `${label}, dia ${day} de ${days}`,
  budgetTitle: "Orçamento do time",
  budgetSub: "Assentos + API convertidos no câmbio congelado do período.",
  bridge: (seats: string, api: string, apiUsd: string) =>
    `Composição do gasto: ${seats} em assentos + ${api} de API (${apiUsd} convertidos no câmbio congelado).`,
  bridgeNoFx: (seats: string, apiUsd: string) =>
    `Composição do gasto: ${seats} em assentos + ${apiUsd} de API — câmbio do período indisponível, os valores não são somados.`,
  budgetSpent: "Gasto",
  budgetAmount: "Orçamento",
  budgetProjection: "Projeção de fechamento",
  collecting: "coletando ritmo",
  editBudget: "Editar em Ajustes",
  planTitle: "O que dá para fazer",
  planSub: "Plano de contenção sugerido — o Denarius aponta, a decisão é sua.",
  warnBreach: (spent: string, budget: string, pct: string) =>
    `Estourou o orçamento: ${spent} de ${budget} (${pct}).`,
  warnProjected: (projection: string, over: string) =>
    `No ritmo atual, fecha em ${projection} — ${over} acima do orçamento.`,
  warnThreshold: (pct: string) => `Já em ${pct} do orçamento neste ponto do mês.`,
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
    "Modelos sem preço aparecem como “não precificado” em vez de sumir do total.",
  fxNote: (rate: string, date: string) =>
    `Convertido de US$ no câmbio congelado do período (${rate} por US$ 1, capturado em ${date}). O valor original em US$ acompanha cada linha.`,
  fxMissingNote:
    "Câmbio do período indisponível — valores exibidos em US$ (originais), sem conversão estimada.",
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

function budgetWarningLine(team: CockpitTeam, currency: string): string | null {
  const f = team.finding;
  if (f === null) return null;
  const ev = team.evaluation;
  if (f.level === "breach") {
    return copy.warnBreach(
      money(ev.spent, currency),
      money(ev.budget, currency),
      percent(ev.pctSpent),
    );
  }
  if (f.level === "projected_breach" && ev.projection !== null) {
    const over = money(ev.projection - ev.budget, currency);
    return copy.warnProjected(money(ev.projection, currency), over);
  }
  return copy.warnThreshold(percent(ev.pctSpent));
}

/** Budget context (redesign 2026-07): the situation the Home table pointed at,
 *  in full — pill, bar, the three numbers and the warning sentence. */
function TeamBudgetCard({
  team,
  currency,
  bridge,
}: {
  team: CockpitTeam;
  currency: string;
  bridge: CostBridge | null;
}) {
  const ev = team.evaluation;
  const warning = budgetWarningLine(team, currency);
  const bridgeLine =
    bridge === null
      ? null
      : bridge.apiDisplay !== null
        ? copy.bridge(
            money(bridge.seatDisplay, currency),
            money(bridge.apiDisplay, currency),
            money(bridge.apiUsd, "USD"),
          )
        : copy.bridgeNoFx(
            money(bridge.seatDisplay, currency),
            money(bridge.apiUsd, "USD"),
          );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 text-sm">
          {copy.budgetTitle}
          <StatusPill status={team.status} />
        </CardTitle>
        <CardDescription>{copy.budgetSub}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <BudgetBar
            className="flex-1"
            pctSpent={ev.pctSpent}
            pctProjected={team.pctProjected}
            status={team.status}
          />
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {percent(ev.pctSpent)}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">{copy.budgetSpent}</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">
              {money(ev.spent, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{copy.budgetAmount}</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">
              {money(ev.budget, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {copy.budgetProjection}
            </dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">
              {ev.projection === null
                ? `— ${copy.collecting}`
                : money(ev.projection, currency)}
            </dd>
          </div>
        </dl>
        {warning && <p className="text-sm/relaxed">{warning}</p>}
        {bridgeLine && (
          <p className="text-xs/relaxed text-muted-foreground tabular-nums">
            {bridgeLine}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Link
          href="/ajustes/orcamentos"
          className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {copy.editBudget} →
        </Link>
      </CardFooter>
    </Card>
  );
}

/** The curated control plan (redesign 2026-07: moved here from the Home rows —
 *  acting on a warning is investigation, not overview). Catalog-only, read-only. */
function ControlPlanCard({ team }: { team: CockpitTeam }) {
  if (team.finding === null || team.finding.controlPlan.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{copy.planTitle}</CardTitle>
        <CardDescription>{copy.planSub}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3.5">
          {team.finding.controlPlan.map((action) => {
            const href =
              action.id === "review-idle-seats"
                ? "/ajustes/assinaturas"
                : action.id === "set-provider-limit"
                  ? "/ajustes/conexoes"
                  : action.id === "revisit-budget"
                    ? "/ajustes/orcamentos"
                    : action.id === "talk-to-top-team"
                      ? "#contribuidores"
                      : "/explorar#por-modelo";
            return (
            <li key={action.id}>
              <Link
                href={href}
                className="group flex items-start justify-between gap-4 rounded-lg border p-4 outline-none transition-colors hover:border-primary/30 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <span>
              <span className="block text-sm font-medium">{action.title}</span>
              <p className="mt-0.5 text-xs/relaxed text-muted-foreground">
                {action.detail}
              </p>
                </span>
                <IconArrowRight className="mt-0.5 size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          );})}
        </ul>
      </CardContent>
    </Card>
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
      <PageContainer variant="wide" className="gap-6">
        <Crumbs current={copy.adminOnlyTitle} />
        <EmptyState
          icon={<IconLock />}
          title={copy.adminOnlyTitle}
          description={copy.adminOnlyBody}
          primaryAction={<Link href="/explorar">{copy.adminOnlyCta}</Link>}
        />
      </PageContainer>
    );
  }

  const [detail, { cockpit, fx }, dailyUsd, { subscriptions }] =
    await Promise.all([
      teamDetail(teamId),
      getCockpitData(),
      teamDailyApiUsd(teamId),
      listSubscriptions(),
    ]);
  if (!detail.found) notFound();

  const period = currentPeriod();

  // [Simular] in context (#21): pre-loaded with this team's budget evaluation.
  // Only budgeted teams have a scenario to run against.
  const cockpitTeam =
    cockpit.state === "ready" ? findCockpitTeam(cockpit, teamId) : undefined;

  // Cumulative series (F3 chart): same combine as the evaluation — the
  // period's frozen FX and the accrued seat slice — so the line's last point
  // IS the card's "Gasto". Only budgeted teams have a budget to chart against.
  const teamSeatAccrued =
    attributeSeats(subscriptions, period).teams.find(
      (t) => t.teamId === teamId,
    )?.accrued ?? 0;
  const cumulativePoints = cockpitTeam
    ? buildCumulativeSpend({
        apiByDay: dailyUsd,
        fxRate: fx?.rate ?? null,
        seatAccrued: teamSeatAccrued,
        dayOfPeriod: period.dayOfPeriod,
      })
    : [];

  const displayCurrency = cockpit.state === "ready" ? cockpit.currency : "BRL";

  // The explicit bridge between the governed total ("Gasto") and the person
  // table below it: governed = seats (display) + API (USD × frozen FX). The
  // audit read the two as contradictory numbers; this states the relationship.
  const bridge = cockpitTeam
    ? costBridge({
        currency: displayCurrency,
        seatDisplay: teamSeatAccrued,
        apiUsd: detail.totalUsd,
        fx,
      })
    : null;

  return (
    <PageContainer variant="wide" className="gap-6">
      <Crumbs current={detail.teamName} />

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {detail.teamName}
          </h1>
          <p className="mt-1 max-w-2xl text-sm/relaxed text-muted-foreground">
            {copy.subtitle}
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

      {cockpit.state === "ready" && cockpitTeam && (
        <>
          <TeamBudgetCard
            team={cockpitTeam}
            currency={cockpit.currency}
            bridge={bridge}
          />
          <CumulativeChart
            points={cumulativePoints}
            projection={cockpitTeam.evaluation.projection}
            budget={cockpitTeam.evaluation.budget}
            currency={cockpit.currency}
            dayOfPeriod={period.dayOfPeriod}
            daysInPeriod={period.daysInPeriod}
          />
          <ControlPlanCard team={cockpitTeam} />
        </>
      )}

      {detail.persons.length === 0 ? (
        <EmptyState
          icon={<IconUsersGroup />}
          title={copy.emptyTitle}
          description={copy.emptyBody}
          primaryAction={<Link href="/ajustes/atribuicao">{copy.emptyCta}</Link>}
        />
      ) : (
        <Card id="contribuidores" className="scroll-mt-20">
          <CardHeader>
            <CardTitle className="text-sm">{copy.personTitle}</CardTitle>
            <CardDescription>
              {copy.personSub}
              {detail.namesHidden &&
                detail.persons.some((p) => !p.isShared) &&
                ` ${copy.namesHiddenNote}`}
            </CardDescription>
            <div className="text-xs text-muted-foreground tabular-nums">
              {copy.asOf(period.monthLabel, period.dayOfPeriod, period.daysInPeriod)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:hidden">
              {detail.persons.map((person) => (
                <div key={person.userId || "__shared__"} className="rounded-lg border p-4">
                  <p className="font-medium">
                    {person.isShared ? copy.sharedKey : person.userId}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">{copy.colTokens}</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {compactTokens.format(person.inputTokens + person.outputTokens)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{copy.colDerived}</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {person.uncosted && person.derivedUsd === 0 ? copy.uncosted : (
                          <UsdValue value={usdDisplay(person.derivedUsd, displayCurrency, fx)} />
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
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
                        <UsdValue
                          value={usdDisplay(person.derivedUsd, displayCurrency, fx)}
                        />
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
                    <UsdValue
                      value={usdDisplay(detail.totalUsd, displayCurrency, fx)}
                    />
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-start gap-1 text-xs/relaxed text-muted-foreground">
            <p>
              {fx !== null
                ? copy.fxNote(money(fx.rate, displayCurrency), fx.date ?? "—")
                : copy.fxMissingNote}
            </p>
            {detail.hasUncosted && <p>{copy.uncostedNote}</p>}
          </CardFooter>
        </Card>
      )}
    </PageContainer>
  );
}
