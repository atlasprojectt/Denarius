import Link from "next/link";
import {
  RiBarChartHorizontalLine,
  RiCheckboxCircleLine,
  RiCompass3Line,
  RiInformationLine,
} from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { listBudgets } from "@/lib/budgets/queries";
import { attributeSeats } from "@/lib/engine/accrual";
import { governedDailySpend } from "@/lib/engine/budget";
import { buildUsageEconomics } from "@/lib/engine/economics";
import { forecast } from "@/lib/engine/forecast";
import { oldestActiveSync } from "@/lib/engine/freshness";
import {
  periodFx,
  usdDisplay,
  type UsdDisplay,
} from "@/lib/engine/money-model";
import { currentPeriod } from "@/lib/engine/period";
import { reconcile } from "@/lib/engine/reconcile";
import { syncStamp } from "@/lib/format";
import { money } from "@/lib/money";
import { listSubscriptions } from "@/lib/subscriptions/queries";
import { listTeams } from "@/lib/teams/queries";
import { createClient } from "@/lib/supabase/server";
import { apiSpendMonthToDate } from "@/lib/usage/queries";
import {
  CalculationDetails,
  type CalculationItem,
} from "./_components/calculation-details";
import { ExploreTable, type ExploreRow } from "./_components/explore-table";
import { ExploreTabs } from "./_components/explore-tabs";

const copy = {
  title: "Explorar",
  subtitle: "Analise onde os gastos se concentram por modelo e por assentos.",
  asOf: (label: string, day: number, days: number) =>
    `${capitalize(label)} · dia ${day} de ${days}`,
  emptyTitle: "Sem dados para explorar ainda",
  emptyBody:
    "Conecte a OpenAI e a Anthropic para importar o gasto real de API, ou registre assinaturas e assentos para acompanhar o custo fixo por time.",
  emptySeatsCta: "Adicionar assinaturas",
  emptyConnectCta: "Conectar provedores",
  modelsEmptyTitle: "Sem uso de API neste período",
  modelsEmptyBody:
    "Conecte um provedor ou aguarde a próxima sincronização para ver o gasto por modelo.",
  seatsTitle: "Assentos por time",
  seatsSub: "Custo de assinaturas distribuído dia a dia no período.",
  colTeam: "Time",
  colSpend: "Gasto acumulado",
  unattributed: "Não atribuído",
  mapIt: "Mapear",
  reconcile: (total: string) => `Total reconciliado: ${total}`,
  apiTitle: (label: string) => `Uso de API por modelo — ${capitalize(label)}`,
  apiAsOf: (stamp: string) => `Atualizado ${stamp}`,
  reported: "Gasto reportado",
  priced: "Gasto precificado por modelo",
  pricedDetail: "Total detalhado na lista",
  unpriced: "Ainda sem precificação",
  colModel: "Modelo",
  colTokens: "Tokens",
  colDerived: "Gasto",
  unpricedNote:
    "Modelos sem preço aparecem em uma seção própria e seus tokens permanecem visíveis.",
  derivedNote: (derived: string, reported: string) =>
    `Derivado de tokens × preço: ${derived} · reportado pelos provedores: ${reported}.`,
  fxNote: (rate: string, date: string) =>
    `Convertido de US$ no câmbio congelado do período (${rate} por US$ 1, capturado em ${date}).`,
  fxMissingNote:
    "Câmbio do período indisponível — valores de API exibidos em US$ (originais), sem conversão estimada.",
  unpricedBand: (amount: string) =>
    `${amount} ainda não foram distribuídos entre modelos porque existem modelos sem preço cadastrado.`,
  overDerivedBand: (amount: string) =>
    `O valor precificado supera o total reportado em ${amount}. Consulte os detalhes do cálculo.`,
  calculationReported: "Total reportado pelo provedor",
  calculationDerived: "Total derivado de tokens × preço",
  calculationUnpriced: "Valor sem precificação",
  calculationFx: "Câmbio congelado do período",
  fxUnavailable: "Indisponível",
  fxCaptured: (rate: string, date: string) =>
    `${rate} por US$ 1 · capturado em ${date}`,
  zero: "Sem gasto neste período.",
};

type ConnectionRow = {
  provider: string;
  status: string;
  last_sync_at: string | null;
};

function capitalize(value: string): string {
  return value.length === 0
    ? value
    : value[0].toLocaleUpperCase("pt-BR") + value.slice(1);
}

export default async function ExplorePage() {
  const period = currentPeriod();
  const supabase = await createClient();
  const [
    { subscriptions, currency },
    apiSpend,
    budgets,
    allTeams,
    { data: connectionData },
    { data: dailyCostData },
  ] = await Promise.all([
    listSubscriptions(),
    apiSpendMonthToDate(),
    listBudgets(),
    listTeams(),
    supabase
      .from("provider_connection")
      .select("provider, status, last_sync_at"),
    supabase.from("cost_daily").select("date, amount").gte("date", period.monthStart),
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

  const lastSyncAt = oldestActiveSync(
    ((connectionData ?? []) as ConnectionRow[]).map((connection) => ({
      status: connection.status,
      lastSyncAt: connection.last_sync_at,
    })),
  );

  const coldStart = subscriptions.length === 0 && !apiSpend.hasData;
  const reconciliation = reconcile(apiSpend.derivedUsd, apiSpend.monthUsd);
  const unpricedDisplay = usdDisplay(reconciliation.driftUsd, currency, fx);
  const absoluteDifference = usdDisplay(
    Math.abs(reconciliation.driftUsd),
    currency,
    fx,
  );
  const differenceAmount = primaryMoney(absoluteDifference);
  const differenceNotice =
    reconciliation.driftUsd >= 0
      ? copy.unpricedBand(differenceAmount)
      : copy.overDerivedBand(differenceAmount);
  const fxNote =
    fx !== null
      ? copy.fxNote(money(fx.rate, currency), fx.date ?? "—")
      : copy.fxMissingNote;

  // Comparison inputs are USD-native (model prices are USD per 1M tokens) while
  // budgets are display-currency native — convert the org budget to USD at the
  // frozen period rate for the engine, and hand the drawer the rate + currency
  // so it renders display-primary. Without a rate there is no honest budget
  // comparison: budgetFit stays unknown by passing null (never a guess).
  const fxRate = fx?.rate ?? null;
  const fxDate = fx?.date ?? null;
  const orgBudgetUsd =
    budgets.org && fxRate !== null && fxRate > 0
      ? budgets.org.amount / fxRate
      : null;

  // Forecast v2 close for the drawer budget-fit: the same governed daily series
  // Home evaluates, re-derived here from this screen's own reads. Display
  // currency throughout, converted back to USD for the USD-native engine.
  // Collecting (day <5), missing FX or no series → null → budgetFit unknown.
  const apiByDay = new Map<string, number>();
  for (const row of ((dailyCostData ?? []) as { date: string; amount: number }[])) {
    apiByDay.set(row.date, (apiByDay.get(row.date) ?? 0) + row.amount);
  }
  const orgDailySpend = governedDailySpend({
    apiByDay: [...apiByDay.entries()].map(([date, usd]) => ({ date, usd })),
    fxRate,
    seatAccrued: breakdown.orgTotal,
    monthStart: period.monthStart,
    dayOfPeriod: period.dayOfPeriod,
  });
  const orgSpentDisplay =
    fxRate !== null && fxRate > 0
      ? breakdown.orgTotal + apiSpend.monthUsd * fxRate
      : breakdown.orgTotal;
  const orgProjectedDisplay = orgDailySpend
    ? forecast({
        dailySpend: orgDailySpend,
        spent: orgSpentDisplay,
        period: { dayOfPeriod: period.dayOfPeriod, daysInPeriod: period.daysInPeriod, startDate: period.monthStart },
        budget: budgets.org?.amount,
      }).centralEstimate
    : null;
  const orgProjectedUsd =
    orgProjectedDisplay !== null && fxRate !== null && fxRate > 0
      ? orgProjectedDisplay / fxRate
      : null;

  const modelRows: ExploreRow[] = apiSpend.byModel.map((row) => {
    const usd = row.derivedCost ?? 0;
    const display = usdDisplay(usd, currency, fx);
    const modelUsage = apiSpend.comparisonUsage.filter(
      (usage) => usage.provider === row.provider && usage.model === row.model,
    );
    // Usage Economics (#136) wired at the only grain the reads support
    // (org → model, current period): coverage, derived cost and cost-per-1M
    // come from the engine, never recomputed ad hoc. No request counts exist
    // in usage_daily, so call metrics stay explicitly null; no previous period
    // is read, so period deltas stay "sem base anterior" (never zero).
    const economics = buildUsageEconomics({
      usage: modelUsage.map((usage) => ({ ...usage, teamId: null, calls: undefined })),
      expectedDays: period.dayOfPeriod,
    });
    return {
      id: `${row.provider}:${row.model}`,
      label: row.model,
      amount: row.uncosted ? null : display.display,
      originalUsd: row.uncosted ? undefined : usd,
      tokens: row.inputTokens + row.outputTokens,
      share:
        !row.uncosted && apiSpend.derivedUsd > 0
          ? usd / apiSpend.derivedUsd
          : 0,
      state: row.uncosted ? "unpriced" : "default",
      comparison: row.uncosted
        ? undefined
        : {
            provider: row.provider,
            model: row.model,
            usage: modelUsage,
            prices: apiSpend.modelPrices,
            budgetUsd: orgBudgetUsd,
            projectedCostUsd: orgProjectedUsd,
            expectedDays: period.dayOfPeriod,
            currency,
            fxRate,
            fxDate,
            lastSyncAt: lastSyncAt ? syncStamp(lastSyncAt) : null,
            dayOfPeriod: period.dayOfPeriod,
            periodLabel: period.monthLabel,
            economics: {
              derivedCostUsd: economics.totals.derivedCostUsd,
              costPerMillionUsd: economics.totals.costPerMillionTokensUsd,
              uncosted: economics.totals.uncosted,
              coverage: economics.coverage,
            },
          },
    };
  });

  const seatsByTeam = new Map(
    breakdown.teams.map((team) => [team.teamId, team.accrued]),
  );
  const seatRows: ExploreRow[] = allTeams.map((team) => {
    const amount = seatsByTeam.get(team.id) ?? 0;
    return {
      id: team.id,
      label: team.name,
      amount,
      share: breakdown.orgTotal > 0 ? amount / breakdown.orgTotal : 0,
      note: amount === 0 ? copy.zero : undefined,
    };
  });
  if (breakdown.unattributed > 0) {
    seatRows.push({
      id: "__unattributed__",
      label: copy.unattributed,
      amount: breakdown.unattributed,
      share:
        breakdown.orgTotal > 0
          ? breakdown.unattributed / breakdown.orgTotal
          : 0,
      href: "/ajustes/assinaturas",
      state: "unattributed",
      actionLabel: copy.mapIt,
    });
  }

  const calculationItems: CalculationItem[] = [
    {
      label: copy.calculationReported,
      value: inDisplay(apiSpend.monthUsd),
    },
    {
      label: copy.calculationDerived,
      value: inDisplay(apiSpend.derivedUsd),
    },
    {
      label: copy.calculationUnpriced,
      value: primaryMoney(unpricedDisplay),
    },
    {
      label: copy.calculationFx,
      value:
        fx !== null
          ? copy.fxCaptured(money(fx.rate, currency), fx.date ?? "—")
          : copy.fxUnavailable,
    },
  ];

  const periodLabel = copy.asOf(
    period.monthLabel,
    period.dayOfPeriod,
    period.daysInPeriod,
  );

  return (
    <PageContainer variant="wide" className="gap-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        meta={periodLabel}
      />

      {coldStart ? (
        <EmptyState
          icon={<RiCompass3Line />}
          title={copy.emptyTitle}
          description={copy.emptyBody}
          primaryAction={
            <Link href="/ajustes/conexoes">{copy.emptyConnectCta}</Link>
          }
          secondaryAction={
            <Link href="/ajustes/assinaturas">{copy.emptySeatsCta}</Link>
          }
        />
      ) : (
        <ExploreTabs
          defaultTab={apiSpend.hasData ? "models" : "seats"}
          models={
            apiSpend.hasData ? (
              <Card id="por-modelo" className="gap-0 py-0">
                <CardHeader className="py-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <CardTitle>
                      <h2>{copy.apiTitle(period.monthLabel)}</h2>
                    </CardTitle>
                    {lastSyncAt && (
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {copy.apiAsOf(syncStamp(lastSyncAt))}
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="flex flex-col border-y border-border md:grid md:grid-cols-[1fr_auto_1fr_auto_1fr]">
                    <FinancialMetric
                      label={copy.reported}
                      value={usdDisplay(apiSpend.monthUsd, currency, fx)}
                      primary
                    />
                    <Separator className="md:hidden" />
                    <Separator
                      orientation="vertical"
                      className="my-4 hidden md:block"
                    />
                    <FinancialMetric
                      label={copy.priced}
                      detail={copy.pricedDetail}
                      value={usdDisplay(apiSpend.derivedUsd, currency, fx)}
                    />
                    <Separator className="md:hidden" />
                    <Separator
                      orientation="vertical"
                      className="my-4 hidden md:block"
                    />
                    <FinancialMetric
                      label={copy.unpriced}
                      value={unpricedDisplay}
                    />
                  </div>

                  <div className="flex flex-col gap-3 p-4">
                    <ExploreTable
                      rows={modelRows}
                      currency={currency}
                      labelHeader={copy.colModel}
                      tokensHeader={copy.colTokens}
                      amountHeader={copy.colDerived}
                    />

                    <div className="flex items-start gap-2 rounded-lg border border-border px-3 py-2.5 text-xs/relaxed text-muted-foreground">
                      <RiInformationLine
                        aria-hidden
                        className="mt-0.5 size-3.5 shrink-0"
                      />
                      <p>{differenceNotice}</p>
                    </div>

                    <CalculationDetails
                      items={calculationItems}
                      notes={[
                        copy.derivedNote(
                          inDisplay(apiSpend.derivedUsd),
                          inDisplay(apiSpend.monthUsd),
                        ),
                        copy.unpricedNote,
                        fxNote,
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              // The tab stays visible with a contextual empty instead of
              // silently disappearing while seats carry the screen.
              <EmptyState
                icon={<RiBarChartHorizontalLine />}
                title={copy.modelsEmptyTitle}
                description={copy.modelsEmptyBody}
                primaryAction={
                  <Link href="/ajustes/conexoes">{copy.emptyConnectCta}</Link>
                }
              />
            )
          }
          seats={
            subscriptions.length > 0 ? (
              <Card id="assentos" className="gap-0 py-0">
                <CardHeader className="py-4">
                  <CardTitle>
                    <h2>{copy.seatsTitle}</h2>
                  </CardTitle>
                  <CardDescription>{copy.seatsSub}</CardDescription>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {periodLabel}
                  </p>
                </CardHeader>
                <CardContent className="border-t border-border p-4">
                  <ExploreTable
                    rows={seatRows}
                    currency={currency}
                    labelHeader={copy.colTeam}
                    amountHeader={copy.colSpend}
                  />
                </CardContent>
                <CardFooter className="border-t border-border py-3 text-xs text-muted-foreground">
                  <RiCheckboxCircleLine
                    aria-hidden
                    className="mr-2 size-3.5 shrink-0"
                  />
                  <p className="font-medium text-foreground tabular-nums">
                    {copy.reconcile(money(breakdown.orgTotal, currency))}
                  </p>
                </CardFooter>
              </Card>
            ) : undefined
          }
        />
      )}
    </PageContainer>
  );
}

function primaryMoney(value: UsdDisplay): string {
  return value.display === null
    ? money(value.usd, "USD")
    : money(value.display, value.currency);
}

function FinancialMetric({
  label,
  detail,
  value,
  primary = false,
}: {
  label: string;
  detail?: string;
  value: UsdDisplay;
  primary?: boolean;
}) {
  return (
    <div className="min-w-0 px-4 py-4">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className={
          primary
            ? "mt-1 text-xl font-semibold tracking-tight text-foreground tabular-nums"
            : "mt-1 text-lg font-medium tracking-tight text-foreground tabular-nums"
        }
      >
        {primaryMoney(value)}
      </p>
      {value.display !== null && (
        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
          {money(value.usd, "USD")}
        </p>
      )}
      {detail && (
        <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}
