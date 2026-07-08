import Link from "next/link";
import { CompassIcon } from "@phosphor-icons/react/dist/ssr";

import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/domain/page-header";
import { StaleBanner } from "@/components/domain/stale-banner";
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
import { attributeSeats } from "@/lib/engine/accrual";
import { freshness, type ConnectionStatus } from "@/lib/engine/freshness";
import { currentPeriod } from "@/lib/engine/period";
import { utcStamp } from "@/lib/format";
import { money } from "@/lib/money";
import { listSubscriptions } from "@/lib/subscriptions/queries";
import { createClient } from "@/lib/supabase/server";
import { teamApiSpend } from "@/lib/usage/attribution";
import { apiSpendMonthToDate } from "@/lib/usage/queries";

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
    "Custo derivado (tokens × preço), em US$. Clique em um time para investigar.",
  apiTeamAsOf: (stamp: string) => `dados de ${stamp}`,
  apiTeamReconcile: (total: string) =>
    `Empresa = soma dos times + não atribuído = ${total} — sempre reconcilia.`,
  driftUncosted: (drift: string) =>
    `Derivado e reportado diferem em ${drift}, provavelmente por modelos não precificados neste mês.`,
  driftWarn: (drift: string, pct: string) =>
    `Atenção: o gasto derivado difere do reportado pelos provedores em ${drift} (${pct}) — confira a tabela de preços.`,
  apiTitle: (label: string) => `Uso de API por modelo — ${label}`,
  apiHeadline: (total: string) => `${total} neste mês`,
  apiAsOf: (stamp: string) => `dados de ${stamp}`,
  colModel: "Modelo",
  colTokens: "Tokens",
  colDerived: "Gasto derivado",
  uncosted: "não precificado",
  uncostedNote:
    "Modelos sem preço na tabela aparecem como “não precificado” em vez de sumir do total.",
  derivedNote: (derived: string, reported: string) =>
    `Derivado de tokens × preço: ${derived} · reportado pelos provedores: ${reported}. Valores em US$ — a conversão usa o câmbio congelado do orçamento.`,
};

const compactTokens = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

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
  const [{ subscriptions, currency }, apiSpend, apiTeams, { data: connectionData }] =
    await Promise.all([
      listSubscriptions(),
      apiSpendMonthToDate(),
      teamApiSpend(),
      supabase
        .from("provider_connection")
        .select("provider, status, last_sync_at"),
    ]);
  const breakdown = attributeSeats(subscriptions, period);

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
        ? copy.driftUncosted(money(Math.abs(rec.driftUsd), "USD"))
        : copy.driftWarn(
            money(Math.abs(rec.driftUsd), "USD"),
            rec.driftPct === null ? "—" : pctFmt.format(rec.driftPct),
          )
      : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        meta={copy.asOf(period.monthLabel, period.dayOfPeriod, period.daysInPeriod)}
      />

      {fresh.showBanner && <StaleBanner items={fresh.needsAttention} />}

      {coldStart && (
        <EmptyState
          icon={<CompassIcon />}
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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{copy.apiTeamTitle}</CardTitle>
            <CardDescription>{copy.apiTeamSub}</CardDescription>
            {lastSyncAt && (
              <CardAsOf>{copy.apiTeamAsOf(utcStamp(lastSyncAt))}</CardAsOf>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.colTeam}</TableHead>
                  <TableHead className="text-right">{copy.colDerived}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiTeams.teams.map((team) => (
                  <TableRow key={team.teamId}>
                    <TableCell className="p-0 font-medium">
                      <Link
                        href={`/explorar/time/${team.teamId}`}
                        className="block px-2 py-2.5 transition-colors hover:text-primary"
                      >
                        {team.teamName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(team.derivedUsd, "USD")}
                      {team.uncosted && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (+{copy.uncosted})
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    {copy.unattributed}{" "}
                    {apiTeams.unattributedUsd > 0 && (
                      <Link
                        href="/ajustes/atribuicao"
                        className="text-xs underline-offset-4 hover:underline"
                      >
                        {copy.mapIt} →
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {money(apiTeams.unattributedUsd, "USD")}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
          <CardFooter className="flex-col items-start gap-1 text-xs/relaxed text-muted-foreground">
            {driftNotice && <p>{driftNotice}</p>}
            <p>{copy.apiTeamReconcile(money(apiTeams.orgTotalUsd, "USD"))}</p>
          </CardFooter>
        </Card>
      )}

      {apiSpend.hasData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {copy.apiTitle(period.monthLabel)}
            </CardTitle>
            <CardDescription className="text-xl font-semibold tabular-nums text-foreground">
              {copy.apiHeadline(money(apiSpend.monthUsd, "USD"))}
            </CardDescription>
            {lastSyncAt && (
              <CardAsOf>{copy.apiAsOf(utcStamp(lastSyncAt))}</CardAsOf>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.colModel}</TableHead>
                  <TableHead className="text-right">{copy.colTokens}</TableHead>
                  <TableHead className="text-right">{copy.colDerived}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiSpend.byModel.map((row) => (
                  <TableRow key={row.model}>
                    <TableCell className="font-medium">{row.model}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {compactTokens.format(row.inputTokens + row.outputTokens)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.uncosted ? (
                        <span className="font-medium text-muted-foreground">
                          {copy.uncosted}
                        </span>
                      ) : (
                        money(row.derivedCost ?? 0, "USD")
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex-col items-start gap-1 text-xs/relaxed text-muted-foreground">
            <p>
              {copy.derivedNote(
                money(apiSpend.derivedUsd, "USD"),
                money(apiSpend.monthUsd, "USD"),
              )}
            </p>
            <p>{copy.uncostedNote}</p>
          </CardFooter>
        </Card>
      )}

      {subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{copy.seatsTitle}</CardTitle>
            <CardDescription>{copy.seatsSub}</CardDescription>
            <CardAsOf>
              {copy.asOf(period.monthLabel, period.dayOfPeriod, period.daysInPeriod)}
            </CardAsOf>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.colTeam}</TableHead>
                  <TableHead className="text-right">{copy.colSpend}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.teams.map((team) => (
                  <TableRow key={team.teamId}>
                    <TableCell className="font-medium">{team.teamName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(team.accrued, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    {copy.unattributed}{" "}
                    {breakdown.unattributed > 0 && (
                      <Link
                        href="/ajustes/assinaturas"
                        className="text-xs underline-offset-4 hover:underline"
                      >
                        {copy.mapIt} →
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {money(breakdown.unattributed, currency)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
          <CardFooter className="text-xs/relaxed text-muted-foreground">
            <p>{copy.reconcile(money(breakdown.orgTotal, currency))}</p>
          </CardFooter>
        </Card>
      )}
    </div>
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
