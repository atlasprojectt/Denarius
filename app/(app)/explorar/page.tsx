import Link from "next/link";
import { IconCompass, IconInfoCircle } from "@tabler/icons-react";

import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/domain/page-header";
import { PageContainer } from "@/components/domain/page-container";
import { StaleBanner } from "@/components/domain/stale-banner";
import { UsdValue } from "@/components/domain/usd-value";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listBudgets } from "@/lib/budgets/queries";
import { attributeSeats } from "@/lib/engine/accrual";
import { freshness, type ConnectionStatus } from "@/lib/engine/freshness";
import { periodFx, usdDisplay } from "@/lib/engine/money-model";
import { currentPeriod } from "@/lib/engine/period";
import { utcStamp } from "@/lib/format";
import { money } from "@/lib/money";
import { listSubscriptions } from "@/lib/subscriptions/queries";
import { listTeams } from "@/lib/teams/queries";
import { createClient } from "@/lib/supabase/server";
import { teamApiSpend } from "@/lib/usage/attribution";
import { apiSpendMonthToDate } from "@/lib/usage/queries";
import { ExploreTable, type ExploreRow } from "./_components/explore-table";

const copy = {
  title: "Explorar",
  subtitle:
    "Para onde o gasto vai: por time, por modelo e por assinatura. Controle, não vigilância — pessoas só aparecem no detalhamento de um time, quando permitido.",
  asOf: (label: string, day: number, days: number) =>
    `${label}, dia ${day} de ${days}`,
  emptyTitle: "Sem dados para explorar ainda",
  emptyBody:
    "Conecte a OpenAI e a Anthropic para importar o gasto real de API, ou registre assinaturas e assentos para acompanhar o custo fixo por time.",
  emptySeatsCta: "Adicionar assinaturas",
  emptyConnectCta: "Conectar provedores",
  seatsTitle: "Assentos por time",
  seatsSub: "Custo de assinaturas distribuído dia a dia no período.",
  colTeam: "Time",
  colSpend: "Gasto (acumulado)",
  unattributed: "Não atribuído",
  mapIt: "mapear",
  reconcile: (total: string) =>
    `Total da empresa = soma dos times + não atribuído = ${total} — sempre reconcilia.`,
  apiTeamTitle: "Gasto de API por time",
  apiTeamSub:
    "Custo derivado (tokens × preço), convertido no câmbio congelado do período — o original em US$ acompanha cada valor. Clique em um time para investigar.",
  apiTeamAsOf: (stamp: string) => `dados de ${stamp}`,
  apiTeamReconcile: (total: string) =>
    `Empresa = soma dos times + não atribuído = ${total} — sempre reconcilia.`,
  driftUncosted: (drift: string) =>
    `Derivado e reportado diferem em ${drift}, provavelmente por modelos não precificados neste mês.`,
  driftWarn: (drift: string, pct: string) =>
    `Atenção: o gasto derivado difere do reportado pelos provedores em ${drift} (${pct}) — confira a tabela de preços.`,
  apiTitle: (label: string) => `Uso de API por modelo — ${label}`,
  apiHeadlineSuffix: "neste mês",
  apiAsOf: (stamp: string) => `dados de ${stamp}`,
  colModel: "Modelo",
  colTokens: "Tokens",
  colDerived: "Gasto derivado",
  uncosted: "não precificado",
  uncostedNote:
    "Modelos sem preço na tabela aparecem como “não precificado” em vez de sumir do total.",
  derivedNote: (derived: string, reported: string) =>
    `Derivado de tokens × preço: ${derived} · reportado pelos provedores: ${reported}.`,
  fxNote: (rate: string, date: string) =>
    `Convertido de US$ no câmbio congelado do período (${rate} por US$ 1, capturado em ${date}).`,
  fxMissingNote:
    "Câmbio do período indisponível — valores de API exibidos em US$ (originais), sem conversão estimada.",
  navLabel: "Seções de exploração",
  navTeams: "Por time",
  navModels: "Por modelo",
  navSeats: "Assentos",
  zero: "Sem gasto neste período.",
};

const pctFmt = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 0,
});

type ConnectionRow = {
  provider: string;
  status: string;
  last_sync_at: string | null;
};

export default async function ExplorePage() {
  const period = currentPeriod();
  const supabase = await createClient();
  const [
    { subscriptions, currency },
    apiSpend,
    apiTeams,
    budgets,
    allTeams,
    { data: connectionData },
  ] = await Promise.all([
    listSubscriptions(),
    apiSpendMonthToDate(),
    teamApiSpend(),
    listBudgets(),
    listTeams(),
    supabase
      .from("provider_connection")
      .select("provider, status, last_sync_at"),
  ]);
  const breakdown = attributeSeats(subscriptions, period);

  // ONE frozen FX for the whole screen (money-model contract): USD-native
  // figures render display-currency-first with the original attached; when the
  // rate is missing they stay USD with the disclosure — never a guess.
  const fx = periodFx(budgets);
  const inDisplay = (usd: number): string =>
    fx !== null
      ? `${money(usd * fx.rate, currency)} (${money(usd, "USD")})`
      : money(usd, "USD");

  const connections = ((connectionData ?? []) as ConnectionRow[]).map(
    (c): ConnectionStatus => ({
      provider: c.provider as ConnectionStatus["provider"],
      status: c.status,
      lastSyncAt: c.last_sync_at,
    }),
  );
  const fresh = freshness(connections);
  // Honest stamp across providers: totals are only as fresh as the LEAST fresh
  // active connection, so the oldest successful last_sync_at wins.
  const lastSyncAt =
    connections
      .filter((c) => c.status !== "revoked" && c.lastSyncAt !== null)
      .map((c) => c.lastSyncAt as string)
      .sort()[0] ?? null;

  const coldStart = subscriptions.length === 0 && !apiSpend.hasData;
  const rec = apiTeams.reconciliation;
  const driftNotice =
    apiTeams.hasData && !rec.withinTolerance
      ? apiTeams.hasUncosted
        ? copy.driftUncosted(inDisplay(Math.abs(rec.driftUsd)))
        : copy.driftWarn(
            inDisplay(Math.abs(rec.driftUsd)),
            rec.driftPct === null ? "—" : pctFmt.format(rec.driftPct),
          )
      : null;
  const fxNote =
    fx !== null
      ? copy.fxNote(money(fx.rate, currency), fx.date ?? "—")
      : copy.fxMissingNote;

  const apiTeamById = new Map(apiTeams.teams.map((team) => [team.teamId, team]));
  const apiTeamRows: ExploreRow[] = allTeams.map((team) => {
    const spend = apiTeamById.get(team.id);
    const usd = spend?.derivedUsd ?? 0;
    const display = usdDisplay(usd, currency, fx);
    return {
      id: team.id,
      label: team.name,
      amount: usd === 0 ? 0 : display.display,
      originalUsd: usd,
      href: `/explorar/time/${team.id}`,
      note: spend?.uncosted ? copy.uncosted : usd === 0 ? copy.zero : undefined,
    };
  });
  if (apiTeams.unattributedUsd > 0) {
    const display = usdDisplay(apiTeams.unattributedUsd, currency, fx);
    apiTeamRows.push({
      id: "__unattributed__",
      label: copy.unattributed,
      amount: display.display,
      originalUsd: apiTeams.unattributedUsd,
      href: "/ajustes/atribuicao",
      note: copy.mapIt,
    });
  }

  const modelRows: ExploreRow[] = apiSpend.byModel.map((row) => {
    const usd = row.derivedCost ?? 0;
    const display = usdDisplay(usd, currency, fx);
    return {
      id: row.model,
      label: row.model,
      amount: row.uncosted ? null : display.display,
      originalUsd: row.uncosted ? undefined : usd,
      tokens: row.inputTokens + row.outputTokens,
      note: row.uncosted ? copy.uncosted : undefined,
    };
  });

  const seatsByTeam = new Map(breakdown.teams.map((team) => [team.teamId, team.accrued]));
  const seatRows: ExploreRow[] = allTeams.map((team) => ({
    id: team.id,
    label: team.name,
    amount: seatsByTeam.get(team.id) ?? 0,
    note: (seatsByTeam.get(team.id) ?? 0) === 0 ? copy.zero : undefined,
  }));
  if (breakdown.unattributed > 0) {
    seatRows.push({
      id: "__unattributed__",
      label: copy.unattributed,
      amount: breakdown.unattributed,
      href: "/ajustes/assinaturas",
      note: copy.mapIt,
    });
  }

  return (
    <PageContainer variant="wide" className="gap-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        meta={copy.asOf(period.monthLabel, period.dayOfPeriod, period.daysInPeriod)}
      />

      {fresh.showBanner && <StaleBanner items={fresh.needsAttention} />}

      {!coldStart && (
        <nav aria-label={copy.navLabel} className="sticky top-16 z-[5] flex flex-wrap gap-1 rounded-lg border bg-background/95 p-1 shadow-xs backdrop-blur">
          {apiTeams.hasData && <a href="#por-time" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30">{copy.navTeams}</a>}
          {apiSpend.hasData && <a href="#por-modelo" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30">{copy.navModels}</a>}
          {subscriptions.length > 0 && <a href="#assentos" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30">{copy.navSeats}</a>}
        </nav>
      )}

      {coldStart && (
        <EmptyState
          icon={<IconCompass />}
          title={copy.emptyTitle}
          description={copy.emptyBody}
          primaryAction={
            <Link href="/ajustes/conexoes">{copy.emptyConnectCta}</Link>
          }
          secondaryAction={
            <Link href="/ajustes/assinaturas">{copy.emptySeatsCta}</Link>
          }
        />
      )}

      {apiTeams.hasData && (
        <Card id="por-time" className="scroll-mt-32">
          <CardHeader>
            <CardTitle className="text-sm">{copy.apiTeamTitle}</CardTitle>
            <CardDescription>{copy.apiTeamSub}</CardDescription>
            {lastSyncAt && (
              <CardAsOf>{copy.apiTeamAsOf(utcStamp(lastSyncAt))}</CardAsOf>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ExploreTable
              rows={apiTeamRows}
              currency={currency}
              labelHeader={copy.colTeam}
              amountHeader={copy.colDerived}
            />
            <Alert>
              <IconInfoCircle />
              <AlertDescription className="space-y-1">
                {driftNotice && <p>{driftNotice}</p>}
                <p>{copy.apiTeamReconcile(inDisplay(apiTeams.orgTotalUsd))}</p>
                <p>{fxNote}</p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {apiSpend.hasData && (
        <Card id="por-modelo" className="scroll-mt-32">
          <CardHeader>
            <CardTitle className="text-sm">
              {copy.apiTitle(period.monthLabel)}
            </CardTitle>
            {lastSyncAt && (
              <CardAsOf>{copy.apiAsOf(utcStamp(lastSyncAt))}</CardAsOf>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              <UsdValue value={usdDisplay(apiSpend.monthUsd, currency, fx)} />
              <span className="ml-2 text-sm font-normal tracking-normal text-muted-foreground">
                {copy.apiHeadlineSuffix}
              </span>
            </p>
            <ExploreTable
              rows={modelRows}
              currency={currency}
              labelHeader={copy.colModel}
              tokensHeader={copy.colTokens}
              amountHeader={copy.colDerived}
            />
          </CardContent>
          <CardFooter className="flex-col items-start gap-1 text-xs/relaxed text-muted-foreground">
            <p>
              {copy.derivedNote(
                inDisplay(apiSpend.derivedUsd),
                inDisplay(apiSpend.monthUsd),
              )}
            </p>
            <p>{copy.uncostedNote}</p>
            <p>{fxNote}</p>
          </CardFooter>
        </Card>
      )}

      {subscriptions.length > 0 && (
        <Card id="assentos" className="scroll-mt-32">
          <CardHeader>
            <CardTitle className="text-sm">{copy.seatsTitle}</CardTitle>
            <CardDescription>{copy.seatsSub}</CardDescription>
            <CardAsOf>
              {copy.asOf(period.monthLabel, period.dayOfPeriod, period.daysInPeriod)}
            </CardAsOf>
          </CardHeader>
          <CardContent>
            <ExploreTable
              rows={seatRows}
              currency={currency}
              labelHeader={copy.colTeam}
              amountHeader={copy.colSpend}
            />
          </CardContent>
          <CardFooter className="text-xs/relaxed text-muted-foreground">
            <p>{copy.reconcile(money(breakdown.orgTotal, currency))}</p>
          </CardFooter>
        </Card>
      )}
    </PageContainer>
  );
}

/**
 * "As of" honesty stamp inside a CardHeader (principle #3). Normal flow, under
 * the description — never competes with the title for width.
 */
function CardAsOf({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-muted-foreground tabular-nums">{children}</div>
  );
}
