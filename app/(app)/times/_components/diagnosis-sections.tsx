import Link from "next/link";
import { RiArrowRightLine, RiKey2Line, RiPriceTag3Line } from "@remixicon/react";

import { ProviderIcon, type ProviderIconName } from "@/components/domain/provider-icon";
import { StateBadge } from "@/components/domain/state-badge";
import { UsdValue } from "@/components/domain/usd-value";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CockpitTeam } from "@/lib/engine/cockpit";
import { cut, TICKS } from "@/lib/bars";
import { buildCumulativeSpend } from "@/lib/engine/cumulative";
import { costBridge, usdDisplay, type FrozenFx } from "@/lib/engine/money-model";
import type { Period } from "@/lib/engine/period";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import type { TeamApiDiagnosis } from "@/lib/usage/diagnose";
import { CumulativeChart } from "./cumulative-chart";
import { SpendCalculationDetails } from "./spend-calculation-details";
import { TeamProgress } from "./team-progress";

const copy = {
  summaryTitle: "Resumo executivo",
  summarySub: "Situação do time no período atual.",
  spent: "Gasto",
  budget: "Orçamento",
  projection: "Projeção",
  projectedMargin: "Margem projetada",
  collecting: "Coletando ritmo",
  consumption: (value: string) => `${value} do orçamento consumido`,
  noBudget: "Este time ainda não tem orçamento definido.",
  conclusionBreach: (amount: string) =>
    `O time já ultrapassou o orçamento em ${amount}.`,
  conclusionRisk: (amount: string) =>
    `O gasto ainda está dentro do orçamento, mas deve fechar ${amount} acima.`,
  conclusionControl: (amount: string) =>
    `No ritmo atual, o time deve fechar ${amount} abaixo do orçamento.`,
  conclusionCollecting:
    "Ainda não há histórico suficiente para projetar o fechamento deste período.",
  chartTitle: "Evolução do gasto",
  chartSub:
    "Gasto acumulado, projeção, orçamento e ritmo esperado ao longo do período.",
  chartSubNoBudget:
    "Gasto acumulado no período. Defina um orçamento para habilitar projeção e ritmo esperado.",
  chartEmpty: "Sem gasto registrado neste período ainda.",
  collectingNote:
    "A projeção de fechamento aparece a partir do dia 5 do período.",
  mixTitle: "Composição do gasto",
  mixSub: "Fontes que formam o gasto deste time, ordenadas por valor.",
  mixSeats: "Assentos",
  mixApi: (provider: string) => `API · ${provider}`,
  mixZero: "Sem gasto neste período.",
  bridge: (seats: string, api: string, apiUsd: string) =>
    `${seats} em assentos + ${api} de API (${apiUsd} convertidos no câmbio congelado).`,
  bridgeNoFx: (seats: string, apiUsd: string) =>
    `${seats} em assentos + ${apiUsd} de API. Os valores não são somados sem o câmbio do período.`,
  mixDerivedNote:
    "A composição por provedor usa o custo derivado de tokens × preço; o total reportado fica em Explorar.",
  uncostedNote:
    "Modelos sem preço aparecem como não precificados em vez de desaparecer do total.",
  fxNote: (rate: string, date: string) =>
    `Valores em US$ convertidos pelo câmbio congelado do período (${rate} por US$ 1, capturado em ${date}).`,
  fxMissingNote:
    "Câmbio do período indisponível: valores de API permanecem em US$ e não são somados aos assentos.",
  contributorsTitle: "Contribuintes do gasto",
  contributorsSub:
    "Origens que mais contribuíram para o gasto deste time no período.",
  asOf: (label: string, day: number, days: number) =>
    `${label} · dia ${day} de ${days}`,
  namesHiddenNote:
    "Os nomes estão anonimizados pela política de privacidade da organização.",
  adminOnly:
    "Os contribuintes são visíveis apenas para administradores — controle, não vigilância.",
  contributorsEmpty:
    "Nenhum uso de API foi atribuído a este time neste período.",
  attributionCta: "Revisar atribuição",
  person: "Pessoa ou origem",
  tokens: "Tokens",
  derived: "Gasto derivado",
  sharedKey: "Chave compartilhada",
  uncosted: "Não precificado",
  total: "Total do time",
  planTitle: "Plano de controle",
  planSub: "Ações sugeridas pelo Denarius. A decisão continua sendo sua.",
};

const PROVIDER_LABEL: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

const compactTokens = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-base font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function conclusion(team: CockpitTeam, currency: string): string {
  const evaluation = team.evaluation;
  if (evaluation.breached) {
    return copy.conclusionBreach(
      money(evaluation.spent - evaluation.budget, currency),
    );
  }
  if (evaluation.projectedMargin === null) return copy.conclusionCollecting;
  if (evaluation.projectedMargin < 0) {
    return copy.conclusionRisk(money(-evaluation.projectedMargin, currency));
  }
  return copy.conclusionControl(money(evaluation.projectedMargin, currency));
}

function ExecutiveSummary({
  team,
  currency,
  currentSpend,
}: {
  team: CockpitTeam | null;
  currency: string;
  currentSpend: string;
}) {
  if (team === null) {
    return (
      <Card data-reveal="team-summary" suppressHydrationWarning>
        <CardHeader>
          <CardTitle>{copy.summaryTitle}</CardTitle>
          <CardDescription>{copy.summarySub}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Metric label={copy.spent} value={currentSpend} />
            <Metric label={copy.budget} value="—" />
          </dl>
          <p className="mt-4 border-t border-border/60 pt-3 text-sm text-muted-foreground">
            {copy.noBudget}
          </p>
        </CardContent>
      </Card>
    );
  }

  const evaluation = team.evaluation;
  return (
    <Card data-reveal="team-summary" suppressHydrationWarning>
      <CardHeader>
        <CardTitle>{copy.summaryTitle}</CardTitle>
        <CardDescription>{copy.summarySub}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-4">
          <Metric label={copy.spent} value={money(evaluation.spent, currency)} />
          <Metric label={copy.budget} value={money(evaluation.budget, currency)} />
          <Metric
            label={copy.projection}
            value={
              evaluation.projection === null
                ? "—"
                : money(evaluation.projection, currency)
            }
          />
          <Metric
            label={copy.projectedMargin}
            value={
              evaluation.projectedMargin === null
                ? "—"
                : money(evaluation.projectedMargin, currency)
            }
          />
        </dl>
        <div className="mt-5 flex items-center gap-3">
          <TeamProgress
            className="flex-1"
            pctSpent={evaluation.pctSpent}
            pctProjected={team.pctProjected}
            status={team.status}
          />
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {copy.consumption(percent(evaluation.pctSpent))}
          </span>
        </div>
        <p className="mt-4 border-t border-border/60 pt-3 text-sm/relaxed">
          {conclusion(team, currency)}
        </p>
      </CardContent>
    </Card>
  );
}

type MixRow = {
  key: string;
  label: string;
  icon?: ProviderIconName;
  displayAmount: number | null;
  value: React.ReactNode;
};

function MixSection({
  seatAccrued,
  byProvider,
  currency,
  fx,
  bridgeLine,
  hasUncosted,
}: {
  seatAccrued: number;
  byProvider: { provider: string; usd: number }[];
  currency: string;
  fx: FrozenFx | null;
  bridgeLine: string;
  hasUncosted: boolean;
}) {
  const rows: MixRow[] = [];
  if (seatAccrued > 0) {
    rows.push({
      key: "seats",
      label: copy.mixSeats,
      displayAmount: seatAccrued,
      value: money(seatAccrued, currency),
    });
  }
  for (const provider of byProvider) {
    if (provider.usd <= 0) continue;
    rows.push({
      key: provider.provider,
      label: copy.mixApi(PROVIDER_LABEL[provider.provider] ?? provider.provider),
      icon:
        provider.provider === "openai" || provider.provider === "anthropic"
          ? provider.provider
          : undefined,
      displayAmount: fx === null ? null : provider.usd * fx.rate,
      value: <UsdValue value={usdDisplay(provider.usd, currency, fx)} />,
    });
  }
  if (fx !== null) {
    rows.sort((a, b) => (b.displayAmount ?? 0) - (a.displayAmount ?? 0));
  }
  const total = rows.reduce((sum, row) => sum + (row.displayAmount ?? 0), 0);
  const notes = [
    copy.mixDerivedNote,
    ...(hasUncosted ? [copy.uncostedNote] : []),
    fx !== null
      ? copy.fxNote(money(fx.rate, currency), fx.date ?? "—")
      : copy.fxMissingNote,
  ];

  return (
    <Card data-reveal="team-mix" suppressHydrationWarning>
      <CardHeader>
        <CardTitle>{copy.mixTitle}</CardTitle>
        <CardDescription>{copy.mixSub}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {copy.mixZero}
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {rows.map((row, index) => {
              const share = total > 0 ? (row.displayAmount ?? 0) / total : 0;
              return (
                <li key={row.key}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-4 shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      {row.icon && (
                        <ProviderIcon provider={row.icon} className="size-4" />
                      )}
                      <span className="truncate text-sm">{row.label}</span>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {row.value}
                    </span>
                  </div>
                  {fx !== null && (
                    <div className="relative ml-6 mt-2 h-2 w-[calc(100%-1.5rem)]">
                      <div
                        aria-hidden
                        className="absolute inset-0 text-foreground/15"
                        style={TICKS}
                      />
                      <div
                        data-reveal-bar
                        className="absolute inset-0 text-brand-accent/70"
                        style={{
                          ...TICKS,
                          clipPath: cut(0, share),
                          animationDelay: `${140 + index * 80}ms`,
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <SpendCalculationDetails summary={bridgeLine} notes={notes} />
      </CardContent>
    </Card>
  );
}

function ContributorValue({
  derivedUsd,
  uncosted,
  currency,
  fx,
}: {
  derivedUsd: number;
  uncosted: boolean;
  currency: string;
  fx: FrozenFx | null;
}) {
  if (uncosted && derivedUsd === 0) {
    return (
      <StateBadge icon={RiPriceTag3Line} tone="amber">
        {copy.uncosted}
      </StateBadge>
    );
  }
  return <UsdValue value={usdDisplay(derivedUsd, currency, fx)} />;
}

function ContributorsSection({
  teamId,
  diagnosis,
  currency,
  fx,
  period,
  isAdmin,
  namesHidden,
}: {
  teamId: string;
  diagnosis: TeamApiDiagnosis | null;
  currency: string;
  fx: FrozenFx | null;
  period: Period;
  isAdmin: boolean;
  namesHidden: boolean;
}) {
  const persons = diagnosis?.persons ?? [];
  return (
    <Card
      id={`contribuidores-${teamId}`}
      data-reveal="team-contributors"
      suppressHydrationWarning
      className="scroll-mt-20"
    >
      <CardHeader>
        <CardTitle>{copy.contributorsTitle}</CardTitle>
        <CardDescription>{copy.contributorsSub}</CardDescription>
      </CardHeader>
      <CardContent>
        {!isAdmin ? (
          <p className="py-6 text-sm/relaxed text-muted-foreground">
            {copy.adminOnly}
          </p>
        ) : persons.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">
            <p>{copy.contributorsEmpty}</p>
            <Link
              href="/ajustes/atribuicao"
              className="mt-2 inline-flex font-medium text-foreground underline underline-offset-4"
            >
              {copy.attributionCta}
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <div className="grid grid-cols-[minmax(0,1fr)_100px_132px] gap-4 border-b border-border/60 pb-2 text-[11px] font-medium text-muted-foreground">
                <span>{copy.person}</span>
                <span className="text-right">{copy.tokens}</span>
                <span className="text-right">{copy.derived}</span>
              </div>
              <div className="divide-y divide-border/60">
                {persons.map((person) => (
                  <div
                    key={person.userId || "__shared__"}
                    className="grid grid-cols-[minmax(0,1fr)_100px_132px] items-center gap-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {person.isShared ? copy.sharedKey : person.userId}
                      </span>
                      {person.isShared && (
                        <StateBadge icon={RiKey2Line}>{copy.sharedKey}</StateBadge>
                      )}
                    </div>
                    <span className="text-right text-xs text-muted-foreground tabular-nums">
                      {compactTokens.format(person.inputTokens + person.outputTokens)}
                    </span>
                    <span className="text-right text-sm font-medium tabular-nums">
                      <ContributorValue
                        derivedUsd={person.derivedUsd}
                        uncosted={person.uncosted}
                        currency={currency}
                        fx={fx}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col divide-y divide-border/60 md:hidden">
              {persons.map((person) => (
                <div key={person.userId || "__shared__"} className="py-3 first:pt-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {person.isShared ? copy.sharedKey : person.userId}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                        {compactTokens.format(person.inputTokens + person.outputTokens)} {copy.tokens.toLocaleLowerCase("pt-BR")}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      <ContributorValue
                        derivedUsd={person.derivedUsd}
                        uncosted={person.uncosted}
                        currency={currency}
                        fx={fx}
                      />
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 border-t border-border/60 pt-3">
              <div>
                <p className="text-xs font-medium">{copy.total}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                  {copy.asOf(period.monthLabel, period.dayOfPeriod, period.daysInPeriod)}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                <UsdValue value={usdDisplay(diagnosis?.totalUsd ?? 0, currency, fx)} />
              </span>
            </div>
            {namesHidden && persons.some((person) => !person.isShared) && (
              <p className="mt-3 text-[11px]/relaxed text-muted-foreground">
                {copy.namesHiddenNote}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function controlPlanHref(
  actionId: string,
  fallback: string | undefined,
  teamId: string,
) {
  if (actionId === "talk-to-top-team") return `#contribuidores-${teamId}`;
  if (actionId === "set-provider-limit") return "/ajustes/conexoes";
  return fallback;
}

function ControlPlanSection({ team }: { team: CockpitTeam }) {
  if (team.finding === null || team.finding.controlPlan.length === 0) return null;
  return (
    <Card data-reveal="team-plan" suppressHydrationWarning>
      <CardHeader>
        <CardTitle>{copy.planTitle}</CardTitle>
        <CardDescription>{copy.planSub}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="divide-y divide-border/60 rounded-md border border-border/70">
          {team.finding.controlPlan.map((action, index) => {
            const href = controlPlanHref(action.id, action.href, team.teamId);
            const content = (
              <>
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium tabular-nums">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{action.title}</span>
                  <span className="mt-0.5 block text-xs/relaxed text-muted-foreground">
                    {action.detail}
                  </span>
                </span>
                {href && (
                  <RiArrowRightLine className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                )}
              </>
            );
            return (
              <li key={action.id}>
                {href ? (
                  <Link
                    href={href}
                    className="group flex items-start gap-3 px-3 py-3 outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-3 py-3">{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

export type DiagnosisBodyProps = {
  teamId: string;
  currency: string;
  period: Period;
  fx: FrozenFx | null;
  seatAccrued: number;
  apiUsd: number;
  diagnosis: TeamApiDiagnosis | null;
  cockpitTeam: CockpitTeam | null;
  isAdmin: boolean;
  namesHidden: boolean;
};

export function DiagnosisBody({
  teamId,
  currency,
  period,
  fx,
  seatAccrued,
  apiUsd,
  diagnosis,
  cockpitTeam,
  isAdmin,
  namesHidden,
}: DiagnosisBodyProps) {
  const cumulativePoints = buildCumulativeSpend({
    apiByDay: diagnosis?.daily ?? [],
    fxRate: fx?.rate ?? null,
    seatAccrued,
    dayOfPeriod: period.dayOfPeriod,
  });
  const bridge = costBridge({ currency, seatDisplay: seatAccrued, apiUsd, fx });
  const bridgeLine =
    bridge.apiDisplay !== null
      ? copy.bridge(
          money(bridge.seatDisplay, currency),
          money(bridge.apiDisplay, currency),
          money(bridge.apiUsd, "USD"),
        )
      : copy.bridgeNoFx(
          money(bridge.seatDisplay, currency),
          money(bridge.apiUsd, "USD"),
        );
  const currentSpend =
    bridge.apiDisplay !== null
      ? money(bridge.seatDisplay + bridge.apiDisplay, currency)
      : `${money(bridge.seatDisplay, currency)} + ${money(bridge.apiUsd, "USD")}`;
  const evaluation = cockpitTeam?.evaluation ?? null;

  return (
    <div className="flex flex-col gap-5">
      <ExecutiveSummary
        team={cockpitTeam}
        currency={currency}
        currentSpend={currentSpend}
      />

      <Card data-reveal="team-chart" suppressHydrationWarning>
        <CardHeader>
          <CardTitle>{copy.chartTitle}</CardTitle>
          <CardDescription>
            {cockpitTeam === null ? copy.chartSubNoBudget : copy.chartSub}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CumulativeChart
            points={cumulativePoints}
            projection={evaluation?.projection ?? null}
            budget={evaluation?.budget ?? null}
            currency={currency}
            daysInPeriod={period.daysInPeriod}
            emptyLabel={copy.chartEmpty}
          />
          {evaluation !== null && evaluation.projection === null && (
            <p className="mt-2 text-xs/relaxed text-muted-foreground">
              {copy.collectingNote}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <MixSection
          seatAccrued={seatAccrued}
          byProvider={diagnosis?.byProvider ?? []}
          currency={currency}
          fx={fx}
          bridgeLine={bridgeLine}
          hasUncosted={diagnosis?.hasUncosted ?? false}
        />
        <ContributorsSection
          teamId={teamId}
          diagnosis={diagnosis}
          currency={currency}
          fx={fx}
          period={period}
          isAdmin={isAdmin}
          namesHidden={namesHidden}
        />
      </div>

      {cockpitTeam !== null && <ControlPlanSection team={cockpitTeam} />}
    </div>
  );
}
