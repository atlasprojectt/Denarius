import Link from "next/link";

import { StaleBanner } from "@/components/domain/stale-banner";
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
  subtitle: "Atribuição e investigação por time, pessoa e modelo",
  asOf: (label: string, day: number, days: number) =>
    `${label}, dia ${day} de ${days}`,
  emptyTitle: "Sem dados para explorar ainda",
  emptyBody:
    "Registre assinaturas e assentos ou conecte a OpenAI e a Anthropic para ver o gasto atribuído por time.",
  emptySeatsCta: "Adicionar assinaturas",
  emptyConnectCta: "Conectar provedores",
  seatsTitle: "Assentos por time",
  colTeam: "Time",
  colSpend: "Gasto (acumulado)",
  unattributed: "Não atribuído",
  mapIt: "mapear",
  reconcile: (total: string) =>
    `Total da empresa = soma dos times + não atribuído = ${total} — sempre reconcilia.`,
  apiTeamTitle: "Gasto de API por time",
  apiTeamSub: "Custo derivado (tokens × preço), em US$. Clique em um time para o custo por pessoa.",
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
    `Derivado de tokens × preço: ${derived} · reportado pelos provedores: ${reported}. Valores em US$ — a conversão com câmbio congelado chega com os orçamentos.`,
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      {fresh.showBanner && <StaleBanner items={fresh.needsAttention} />}

      {coldStart && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card p-12 text-center">
          <p className="font-medium">{copy.emptyTitle}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {copy.emptyBody}
          </p>
          <div className="mt-1 flex gap-3">
            <Link
              href="/ajustes/conexoes"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {copy.emptyConnectCta}
            </Link>
            <Link
              href="/ajustes/assinaturas"
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              {copy.emptySeatsCta}
            </Link>
          </div>
        </div>
      )}

      {apiTeams.hasData && (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-semibold">{copy.apiTeamTitle}</h2>
            {lastSyncAt && (
              <span className="text-xs text-muted-foreground">
                {copy.apiTeamAsOf(utcStamp(lastSyncAt))}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{copy.apiTeamSub}</p>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2 font-medium">{copy.colTeam}</th>
                <th className="py-2 pr-2 text-right font-medium">
                  {copy.colDerived}
                </th>
              </tr>
            </thead>
            <tbody>
              {apiTeams.teams.map((team) => (
                <tr key={team.teamId} className="border-b last:border-b-0">
                  <td className="py-2.5 pr-2 font-medium">
                    <Link
                      href={`/explorar/time/${team.teamId}`}
                      className="hover:underline"
                    >
                      {team.teamName}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {money(team.derivedUsd, "USD")}
                    {team.uncosted && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (+{copy.uncosted})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t font-medium text-muted-foreground">
                <td className="py-2.5 pr-2">
                  {copy.unattributed}{" "}
                  {apiTeams.unattributedUsd > 0 && (
                    <Link
                      href="/ajustes/atribuicao"
                      className="text-xs hover:underline"
                    >
                      {copy.mapIt} →
                    </Link>
                  )}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums">
                  {money(apiTeams.unattributedUsd, "USD")}
                </td>
              </tr>
            </tbody>
          </table>

          {driftNotice && (
            <p className="mt-3 text-xs text-muted-foreground">{driftNotice}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.apiTeamReconcile(money(apiTeams.orgTotalUsd, "USD"))}
          </p>
        </section>
      )}

      {apiSpend.hasData && (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-semibold">
              {copy.apiTitle(period.monthLabel)}
            </h2>
            {lastSyncAt && (
              <span className="text-xs text-muted-foreground">
                {copy.apiAsOf(utcStamp(lastSyncAt))}
              </span>
            )}
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {copy.apiHeadline(money(apiSpend.monthUsd, "USD"))}
          </p>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2 font-medium">{copy.colModel}</th>
                <th className="py-2 pr-2 text-right font-medium">
                  {copy.colTokens}
                </th>
                <th className="py-2 pr-2 text-right font-medium">
                  {copy.colDerived}
                </th>
              </tr>
            </thead>
            <tbody>
              {apiSpend.byModel.map((row) => (
                <tr key={row.model} className="border-b last:border-b-0">
                  <td className="py-2.5 pr-2 font-medium">{row.model}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {compactTokens.format(row.inputTokens + row.outputTokens)}
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {row.uncosted ? (
                      <span className="font-medium text-muted-foreground">
                        {copy.uncosted}
                      </span>
                    ) : (
                      money(row.derivedCost ?? 0, "USD")
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 text-xs text-muted-foreground">
            {copy.derivedNote(
              money(apiSpend.derivedUsd, "USD"),
              money(apiSpend.monthUsd, "USD"),
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.uncostedNote}
          </p>
        </section>
      )}

      {subscriptions.length > 0 && (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-semibold">{copy.seatsTitle}</h2>
            <span className="text-xs text-muted-foreground">
              {copy.asOf(
                period.monthLabel,
                period.dayOfPeriod,
                period.daysInPeriod,
              )}
            </span>
          </div>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2 font-medium">{copy.colTeam}</th>
                <th className="py-2 pr-2 text-right font-medium">
                  {copy.colSpend}
                </th>
              </tr>
            </thead>
            <tbody>
              {breakdown.teams.map((team) => (
                <tr key={team.teamId} className="border-b last:border-b-0">
                  <td className="py-2.5 pr-2 font-medium">{team.teamName}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {money(team.accrued, currency)}
                  </td>
                </tr>
              ))}
              {/* Unattributed row: whole row in amber text, no fill. */}
              <tr className="border-t font-medium text-amber-700">
                <td className="py-2.5 pr-2">
                  {copy.unattributed}{" "}
                  {breakdown.unattributed > 0 && (
                    <Link
                      href="/ajustes/assinaturas"
                      className="text-xs hover:underline"
                    >
                      {copy.mapIt} →
                    </Link>
                  )}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums">
                  {money(breakdown.unattributed, currency)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mt-3 text-xs text-muted-foreground">
            {copy.reconcile(money(breakdown.orgTotal, currency))}
          </p>
        </section>
      )}
    </div>
  );
}
