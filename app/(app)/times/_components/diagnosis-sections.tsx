import Link from "next/link";
import { RiArrowRightLine } from "@remixicon/react";

import { BudgetBar } from "@/components/domain/budget-bar";
import { ProviderIcon, type ProviderIconName } from "@/components/domain/provider-icon";
import { SimulateDrawer } from "@/components/domain/simulate-drawer";
import { StatusPill } from "@/components/domain/status-pill";
import { UsdValue } from "@/components/domain/usd-value";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CockpitTeam } from "@/lib/engine/cockpit";
import { buildCumulativeSpend } from "@/lib/engine/cumulative";
import { costBridge, usdDisplay, type FrozenFx } from "@/lib/engine/money-model";
import type { Period } from "@/lib/engine/period";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import type { TeamApiDiagnosis } from "@/lib/usage/diagnose";
import { BudgetEditDialog } from "./budget-edit-dialog";
import { CumulativeChart } from "./cumulative-chart";

// The diagnosis body of one team card (Fase 1 da reestruturação: /times é a
// página de gestão). Server-rendered sections answering "o que aconteceu?":
// estado e projeção (same engine numbers as Home), ritmo diário, decomposição
// do gasto (assentos vs API, por fonte), contribuintes (Admin-only — controle,
// não vigilância) and the curated control plan. All arithmetic is
// engine-provided; this file only lays it out (architecture §9).

const copy = {
  simulate: "Simular",
  stateTitle: "Estado e projeção",
  stateSub: "Assentos + API convertidos no câmbio congelado do período.",
  spent: "Gasto",
  budget: "Orçamento",
  usage: "Consumo",
  projection: "Projeção de fechamento",
  projectedMargin: "Margem projetada",
  collecting: "coletando ritmo",
  collectingNote:
    "Coletando ritmo — a projeção de fechamento aparece a partir do dia 5 do período.",
  warnBreach: (spent: string, budget: string, pct: string) =>
    `Estourou o orçamento: ${spent} de ${budget} (${pct}).`,
  warnProjected: (projection: string, over: string) =>
    `No ritmo atual, fecha em ${projection} — ${over} acima do orçamento.`,
  warnThreshold: (pct: string) => `Já em ${pct} do orçamento neste ponto do mês.`,
  paceTitle: "Ritmo diário",
  paceSub:
    "Gasto acumulado dia a dia contra o ritmo esperado (orçamento distribuído pelos dias) — a linha tracejada é a projeção de fechamento.",
  paceSubNoBudget:
    "Gasto acumulado dia a dia no período. Defina um orçamento para ver o ritmo esperado e a projeção.",
  paceEmpty: "Sem gasto registrado neste período ainda.",
  mixTitle: "Decomposição do gasto",
  mixSeats: "Assentos",
  mixApi: (provider: string) => `API — ${provider}`,
  mixZero: "Sem gasto neste período.",
  bridge: (seats: string, api: string, apiUsd: string) =>
    `Composição do gasto: ${seats} em assentos + ${api} de API (${apiUsd} convertidos no câmbio congelado).`,
  bridgeNoFx: (seats: string, apiUsd: string) =>
    `Composição do gasto: ${seats} em assentos + ${apiUsd} de API — câmbio do período indisponível, os valores não são somados.`,
  mixDerivedNote:
    "A fatia por fonte usa o custo derivado de tokens × preço — o total reportado pelos provedores fica no Explorar.",
  uncostedNote:
    "Modelos sem preço aparecem como “não precificado” em vez de sumir do total.",
  fxNote: (rate: string, date: string) =>
    `Convertido de US$ no câmbio congelado do período (${rate} por US$ 1, capturado em ${date}).`,
  fxMissingNote:
    "Câmbio do período indisponível — valores exibidos em US$ (originais), sem conversão estimada.",
  personTitle: "Custo por pessoa",
  personSub:
    "Contribuintes deste time neste mês. Chaves compartilhadas ficam no time, nunca em uma pessoa.",
  personAsOf: (label: string, day: number, days: number) =>
    `${label}, dia ${day} de ${days}`,
  namesHiddenNote:
    "Nomes ocultos pela política de privacidade — os contribuintes aparecem anonimizados.",
  personAdminOnly:
    "O custo por pessoa é visível apenas para administradores — controle, não vigilância.",
  personEmpty:
    "Nenhum uso de API atribuído a este time ainda. Mapeie um projeto ou workspace em Ajustes → Atribuição.",
  personEmptyCta: "Ir para Atribuição",
  colPerson: "Pessoa / chave",
  colTokens: "Tokens",
  colDerived: "Gasto derivado",
  sharedKey: "Chave compartilhada",
  uncosted: "não precificado",
  total: "Total do time",
  planTitle: "O que dá para fazer",
  planSub: "Plano de contenção sugerido — o Denarius aponta, a decisão é sua.",
};

const PROVIDER_LABEL: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

const compactTokens = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function warningLine(team: CockpitTeam, currency: string): string | null {
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

function Section({
  title,
  sub,
  children,
  id,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h3 className="text-sm font-medium">{title}</h3>
      {sub && <p className="mt-0.5 text-xs/relaxed text-muted-foreground">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Budget state + closing projection — the same engine numbers Home shows. */
function StateSection({
  team,
  currency,
}: {
  team: CockpitTeam;
  currency: string;
}) {
  const ev = team.evaluation;
  const warning = warningLine(team, currency);
  return (
    <Section title={copy.stateTitle} sub={copy.stateSub}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <BudgetBar
            animate
            className="flex-1"
            pctSpent={ev.pctSpent}
            pctProjected={team.pctProjected}
            status={team.status}
          />
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {percent(ev.pctSpent)}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Fact label={copy.spent} value={money(ev.spent, currency)} />
          <Fact label={copy.budget} value={money(ev.budget, currency)} />
          <Fact label={copy.usage} value={percent(ev.pctSpent)} />
          <Fact
            label={copy.projection}
            value={
              ev.projection === null
                ? `— ${copy.collecting}`
                : money(ev.projection, currency)
            }
          />
          <Fact
            label={copy.projectedMargin}
            value={
              ev.projectedMargin === null
                ? `— ${copy.collecting}`
                : money(ev.projectedMargin, currency)
            }
          />
        </dl>
        {warning && <p className="text-sm/relaxed">{warning}</p>}
      </div>
    </Section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** Seats vs API, and API by source — derived cost, disclosed. */
function MixSection({
  seatAccrued,
  byProvider,
  hasUncosted,
  currency,
  fx,
  bridgeLine,
}: {
  seatAccrued: number;
  byProvider: { provider: string; usd: number }[];
  hasUncosted: boolean;
  currency: string;
  fx: FrozenFx | null;
  bridgeLine: string;
}) {
  const rows: { key: string; label: string; icon?: ProviderIconName; value: React.ReactNode }[] = [];
  if (seatAccrued > 0) {
    rows.push({
      key: "seats",
      label: copy.mixSeats,
      value: (
        <span className="tabular-nums">{money(seatAccrued, currency)}</span>
      ),
    });
  }
  for (const p of byProvider) {
    if (p.usd <= 0) continue;
    rows.push({
      key: p.provider,
      label: copy.mixApi(PROVIDER_LABEL[p.provider] ?? p.provider),
      icon:
        p.provider === "openai" || p.provider === "anthropic"
          ? p.provider
          : undefined,
      value: (
        <UsdValue
          className="tabular-nums"
          value={usdDisplay(p.usd, currency, fx)}
        />
      ),
    });
  }

  return (
    <Section title={copy.mixTitle}>
      <div className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.mixZero}</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border">
            {rows.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between gap-4 px-3.5 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm">
                  {row.icon && <ProviderIcon provider={row.icon} className="size-4" />}
                  {row.label}
                </span>
                <span className="text-sm font-medium">{row.value}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-1 text-xs/relaxed text-muted-foreground">
          <p className="tabular-nums">{bridgeLine}</p>
          <p>{copy.mixDerivedNote}</p>
          {hasUncosted && <p>{copy.uncostedNote}</p>}
          <p>
            {fx !== null
              ? copy.fxNote(money(fx.rate, currency), fx.date ?? "—")
              : copy.fxMissingNote}
          </p>
        </div>
      </div>
    </Section>
  );
}

/** Top contributors — Admin-only content; Viewers get the calm disclosure. */
function PersonsSection({
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
  if (!isAdmin) {
    return (
      <Section title={copy.personTitle}>
        <p className="text-xs/relaxed text-muted-foreground">
          {copy.personAdminOnly}
        </p>
      </Section>
    );
  }

  const persons = diagnosis?.persons ?? [];
  const sub =
    persons.length > 0 && namesHidden && persons.some((p) => !p.isShared)
      ? `${copy.personSub} ${copy.namesHiddenNote}`
      : copy.personSub;

  return (
    <Section id={`contribuidores-${teamId}`} title={copy.personTitle} sub={sub}>
      {persons.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {copy.personEmpty}{" "}
          <Link
            href="/ajustes/atribuicao"
            className="font-medium text-foreground underline underline-offset-4"
          >
            {copy.personEmptyCta}
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground tabular-nums">
            {copy.personAsOf(
              period.monthLabel,
              period.dayOfPeriod,
              period.daysInPeriod,
            )}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.colPerson}</TableHead>
                <TableHead className="text-right">{copy.colTokens}</TableHead>
                <TableHead className="text-right">{copy.colDerived}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {persons.map((person) => (
                <TableRow key={person.userId || "__shared__"}>
                  <TableCell className="max-w-56 truncate font-medium">
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
                      <UsdValue value={usdDisplay(person.derivedUsd, currency, fx)} />
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
                    value={usdDisplay(diagnosis?.totalUsd ?? 0, currency, fx)}
                  />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </Section>
  );
}

// UX-13: default investigation targets come from the catalog contract
// (lib/findings/catalog.ts). Two get in-context destinations: the contributors
// block is inside this same card, and provider consoles via Conexões.
function controlPlanHref(actionId: string, fallback: string | undefined, teamId: string) {
  if (actionId === "talk-to-top-team") return `#contribuidores-${teamId}`;
  if (actionId === "set-provider-limit") return "/ajustes/conexoes";
  return fallback;
}

/** The curated control plan — catalog-only, read-only (invariant #2). */
function ControlPlanSection({ team }: { team: CockpitTeam }) {
  if (team.finding === null || team.finding.controlPlan.length === 0) {
    return null;
  }
  return (
    <Section title={copy.planTitle} sub={copy.planSub}>
      <ul className="flex flex-col gap-2.5">
        {team.finding.controlPlan.map((action) => {
          const href = controlPlanHref(action.id, action.href, team.teamId);
          const body = (
            <span>
              <span className="block text-sm font-medium">{action.title}</span>
              <p className="mt-0.5 text-xs/relaxed text-muted-foreground">
                {action.detail}
              </p>
            </span>
          );
          return (
            <li key={action.id}>
              {href ? (
                <Link
                  href={href}
                  className="group flex items-start justify-between gap-4 rounded-lg border p-3.5 outline-none transition-colors hover:border-border hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  {body}
                  <RiArrowRightLine className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-accent-light" />
                </Link>
              ) : (
                <div className="rounded-lg border p-3.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export type DiagnosisBodyProps = {
  teamId: string;
  teamName: string;
  currency: string;
  period: Period;
  fx: FrozenFx | null;
  /** Seat cost accrued to date, display currency. */
  seatAccrued: number;
  /** Token-derived API cost to date, USD (evaluation-consistent). */
  apiUsd: number;
  /** Mapped-usage diagnosis, or null when nothing is attributed yet. */
  diagnosis: TeamApiDiagnosis | null;
  /** Budget evaluation + finding — null for a team without a budget. */
  cockpitTeam: CockpitTeam | null;
  /** Org scope for the simulator; null before an org budget exists. */
  org: { projection: number | null; budget: number } | null;
  isAdmin: boolean;
  namesHidden: boolean;
};

export function DiagnosisBody(props: DiagnosisBodyProps) {
  const {
    teamId,
    teamName,
    currency,
    period,
    fx,
    seatAccrued,
    apiUsd,
    diagnosis,
    cockpitTeam,
    org,
    isAdmin,
    namesHidden,
  } = props;

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

  const evaluation = cockpitTeam?.evaluation ?? null;
  const collecting = evaluation !== null && evaluation.projection === null;

  return (
    <>
      {(cockpitTeam !== null || isAdmin) && (
        <div className="flex flex-wrap items-center gap-2">
          {cockpitTeam !== null && org !== null && (
            <SimulateDrawer
              teamName={teamName}
              currency={currency}
              team={{
                spent: cockpitTeam.evaluation.spent,
                projection: cockpitTeam.evaluation.projection,
                budget: cockpitTeam.evaluation.budget,
              }}
              org={org}
            />
          )}
          {isAdmin && (
            <BudgetEditDialog
              teamId={teamId}
              teamName={teamName}
              currency={currency}
              existing={
                cockpitTeam !== null
                  ? {
                      amount: cockpitTeam.evaluation.budget,
                      warnPct: cockpitTeam.warnPct,
                    }
                  : null
              }
            />
          )}
        </div>
      )}

      {cockpitTeam !== null && (
        <StateSection team={cockpitTeam} currency={currency} />
      )}

      <Section
        title={copy.paceTitle}
        sub={cockpitTeam !== null ? copy.paceSub : copy.paceSubNoBudget}
      >
        <CumulativeChart
          points={cumulativePoints}
          projection={evaluation?.projection ?? null}
          budget={evaluation?.budget ?? null}
          currency={currency}
          dayOfPeriod={period.dayOfPeriod}
          daysInPeriod={period.daysInPeriod}
          emptyLabel={copy.paceEmpty}
        />
        {collecting && (
          <p className="mt-2 text-xs/relaxed text-muted-foreground">
            {copy.collectingNote}
          </p>
        )}
      </Section>

      <MixSection
        seatAccrued={seatAccrued}
        byProvider={diagnosis?.byProvider ?? []}
        hasUncosted={diagnosis?.hasUncosted ?? false}
        currency={currency}
        fx={fx}
        bridgeLine={bridgeLine}
      />

      <PersonsSection
        teamId={teamId}
        diagnosis={diagnosis}
        currency={currency}
        fx={fx}
        period={period}
        isAdmin={isAdmin}
        namesHidden={namesHidden}
      />

      {cockpitTeam !== null && <ControlPlanSection team={cockpitTeam} />}
    </>
  );
}

/** Title row for a budgeted team — always visible, expanded or not. The
 *  numbers live in BudgetedSummaryDetails (collapsed only): once the card is
 *  open, Estado e projeção is the single place they render. */
export function BudgetedSummary({ team }: { team: CockpitTeam }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 truncate font-medium">{team.teamName}</p>
      <StatusPill status={team.status} />
    </div>
  );
}

/** Collapsed-only summary for a budgeted team: warning, the three numbers
 *  and the bar — the situation at a glance without expanding. */
export function BudgetedSummaryDetails({
  team,
  currency,
}: {
  team: CockpitTeam;
  currency: string;
}) {
  const ev = team.evaluation;
  const warning = warningLine(team, currency);
  return (
    <div className="mt-2 flex flex-col gap-2.5">
      {warning && (
        <p className="truncate text-xs text-muted-foreground">{warning}</p>
      )}
      <dl className="grid grid-cols-3 gap-2 text-[11px] leading-relaxed">
        <div>
          <dt className="text-muted-foreground">{copy.spent}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            {money(ev.spent, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{copy.budget}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            {money(ev.budget, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{copy.projection}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            {ev.projection === null ? "—" : money(ev.projection, currency)}
          </dd>
        </div>
      </dl>
      <div className="flex items-center gap-2.5">
        <BudgetBar
          animate
          className="h-2 flex-1"
          pctSpent={ev.pctSpent}
          pctProjected={team.pctProjected}
          status={team.status}
        />
        <span className="text-xs tabular-nums text-muted-foreground">
          {percent(ev.pctSpent)}
        </span>
      </div>
    </div>
  );
}

/** Title row for a team without a budget — always visible. */
export function UnbudgetedSummary({ name }: { name: string }) {
  return <p className="truncate font-medium">{name}</p>;
}

/** Collapsed-only summary for a budget-less team: note + combined spend. Once
 *  open, the decomposição section is the single source of these figures. */
export function UnbudgetedSummaryDetails({
  spend,
  note,
}: {
  /** Combined spend, already formatted upstream (FX-missing disclosed). */
  spend: string;
  note?: string;
}) {
  return (
    <div className="mt-1 flex items-center justify-between gap-4">
      <p className="min-w-0 truncate text-xs text-muted-foreground">
        {note ?? ""}
      </p>
      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
        {spend}
      </span>
    </div>
  );
}
