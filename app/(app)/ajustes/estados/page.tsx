import { notFound } from "next/navigation";
import Link from "next/link";
import {
  RiBarChartLine,
  RiCheckboxCircleFill,
  RiErrorWarningLine,
  RiGroupLine,
  RiInformationLine,
  RiPlugLine,
  RiTimeFill,
} from "@remixicon/react";

import { ActionStatus } from "@/components/domain/action-status";
import { BudgetBar } from "@/components/domain/budget-bar";
import { EmptyState } from "@/components/domain/empty-state";
import { Notice } from "@/components/domain/notice";
import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { StaleBanner } from "@/components/domain/stale-banner";
import { StateBadge, type StateBadgeTone } from "@/components/domain/state-badge";
import { StatusPill } from "@/components/domain/status-pill";
import { TableCardSkeleton } from "@/components/domain/table-card-skeleton";
import { VerdictLine } from "@/components/domain/verdict-line";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { barGeometry } from "@/lib/bars";
import { evaluateBudget } from "@/lib/engine/budget";
import type { ConnectionFreshness } from "@/lib/engine/freshness";
import { computeVerdict, type Verdict } from "@/lib/engine/verdict";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";

// Internal state reference (2026-08-02, founder-directed). The product's states
// are mostly unreachable from live data — the projection guard means the app can
// only be "collecting" before day 5 of the period, and green/amber/red each need
// a specific budget-vs-spend shape. This page renders the REAL components with
// synthetic inputs so every state can be inspected side by side.
//
// The numbers are NOT hand-written: each scenario is fed through evaluateBudget
// and computeVerdict, so what is on screen is what the engine actually produces.
// If a formula changes, this page changes with it (invariant #2 in spirit — the
// display never invents a figure).
//
// Dev-only: it 404s in production, so an internal tool never ships to the CEO.

const copy = {
  title: "Estados do produto",
  description:
    "Referência interna: cada estado do veredicto, do semáforo, da barra de orçamento e das telas, renderizado com os componentes reais.",
  meta: "Ferramenta interna — indisponível em produção",
  verdict: "Veredicto",
  verdictNote:
    "Uma frase determinística + a cor do semáforo. Prioridade por severidade: um estouro já realizado supera um projetado. 'Coletando' é neutro — não é cor, nunca lê como julgamento.",
  semaphore: "Semáforo e badges",
  semaphoreNote:
    "StatusPill é a linguagem do status de orçamento (verde/âmbar/vermelho reservados a ele, princípio #5). StateBadge é a geometria compartilhada — o ícone é obrigatório, então nenhum badge depende só da cor.",
  bar: "Barra de orçamento",
  barNote:
    "A track escala para o maior entre gasto e projeção, então a linha de orçamento desliza para a esquerda conforme o estouro cresce — e some quando o gasto bate exatamente no limite. Preenchido = gasto, fantasma = projeção por ritmo.",
  notices: "Avisos e honestidade de dado",
  noticesNote:
    "Calmos por definição (princípio #6): observam, não alarmam. Âmbar é o tom de qualidade de dado, destrutivo fica reservado a uma sincronização que está de fato falhando, e verde nunca aparece aqui.",
  screens: "Estados de tela",
  screensNote:
    "Todo espaço que pode não ter dado renderiza um estado contextual, nunca um vazio.",
  inputs: "Entradas",
  sentence: "Frase do engine",
};

// ---------------------------------------------------------------------------
// Verdict — five distinct sentences, each computed from a real evaluation.
// ---------------------------------------------------------------------------

const DAYS_IN_PERIOD = 31;

type Scenario = {
  key: string;
  label: string;
  inputs: string;
  day: number;
  org: { budget: number; spent: number };
  teams: { teamId: string; name: string; budget: number; spent: number }[];
};

const scenarios: Scenario[] = [
  {
    key: "collecting",
    label: "Coletando (antes do dia 5)",
    inputs: "Dia 2 · empresa R$ 2.400 de R$ 40.000",
    day: 2,
    org: { budget: 40000, spent: 2400 },
    teams: [],
  },
  {
    key: "green",
    label: "Verde — projeção dentro do orçamento",
    inputs: "Dia 18 · empresa R$ 19.000 de R$ 40.000",
    day: 18,
    org: { budget: 40000, spent: 19000 },
    teams: [],
  },
  {
    key: "amber",
    label: "Âmbar — projeção fecha acima",
    inputs: "Dia 18 · empresa R$ 27.000 de R$ 40.000",
    day: 18,
    org: { budget: 40000, spent: 27000 },
    teams: [],
  },
  {
    key: "red-team",
    label: "Vermelho — um time já estourou",
    inputs: "Dia 18 · Engenharia R$ 13.800 de R$ 12.000",
    day: 18,
    org: { budget: 40000, spent: 31000 },
    teams: [
      { teamId: "eng", name: "Engenharia", budget: 12000, spent: 13800 },
      { teamId: "mkt", name: "Marketing", budget: 9000, spent: 5100 },
    ],
  },
  {
    key: "red-org",
    label: "Vermelho — a empresa estourou",
    inputs: "Dia 24 · empresa R$ 41.200 de R$ 40.000",
    day: 24,
    org: { budget: 40000, spent: 41200 },
    teams: [],
  },
];

function verdictFor(scenario: Scenario): Verdict {
  const period = { dayOfPeriod: scenario.day, daysInPeriod: DAYS_IN_PERIOD };
  return computeVerdict({
    org: evaluateBudget({ ...scenario.org, period }),
    teams: scenario.teams.map((team) => ({
      teamId: team.teamId,
      name: team.name,
      evaluation: evaluateBudget({
        budget: team.budget,
        spent: team.spent,
        period,
      }),
    })),
    currency: "BRL",
  });
}

// ---------------------------------------------------------------------------
// Budget bar — the geometries worth seeing side by side.
// ---------------------------------------------------------------------------

const barCases: {
  label: string;
  pctSpent: number;
  pctProjected: number | null;
  status: Verdict["status"];
}[] = [
  { label: "Nada gasto, sem projeção", pctSpent: 0, pctProjected: null, status: "collecting" },
  { label: "45% gasto, antes do dia 5", pctSpent: 0.45, pctProjected: null, status: "collecting" },
  { label: "45% gasto, projeta 90%", pctSpent: 0.45, pctProjected: 0.9, status: "green" },
  { label: "78% gasto, projeta 98%", pctSpent: 0.78, pctProjected: 0.98, status: "green" },
  { label: "92% gasto, projeta 105%", pctSpent: 0.92, pctProjected: 1.05, status: "amber" },
  { label: "Exatamente no limite", pctSpent: 1, pctProjected: null, status: "red" },
  { label: "20% acima", pctSpent: 1.2, pctProjected: null, status: "red" },
  { label: "60% gasto, projeta 240%", pctSpent: 0.6, pctProjected: 2.4, status: "amber" },
  { label: "80% acima", pctSpent: 1.8, pctProjected: null, status: "red" },
];

const badgeTones: { tone: StateBadgeTone; label: string }[] = [
  { tone: "neutral", label: "Neutro" },
  { tone: "amber", label: "Âmbar" },
  { tone: "positive", label: "Positivo" },
  { tone: "destructive", label: "Destrutivo" },
];

const freshnessCases: { label: string; items: ConnectionFreshness[] }[] = [
  {
    label: "Atrasado (3 dias)",
    items: [{ provider: "anthropic", state: "stale", ageHours: 74 }],
  },
  {
    label: "Falhou",
    items: [{ provider: "openai", state: "failed", ageHours: 30 }],
  },
  {
    label: "Nunca sincronizou",
    items: [{ provider: "anthropic", state: "never", ageHours: null }],
  },
  {
    label: "Os dois provedores",
    items: [
      { provider: "openai", state: "failed", ageHours: 30 },
      { provider: "anthropic", state: "stale", ageHours: 50 },
    ],
  },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-border/60 py-4 first:border-t-0 first:pt-0 sm:grid-cols-[13rem_1fr] sm:gap-6">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function StatesReferencePage() {
  // Never in production: this is a build-time constant, so the route is a plain
  // 404 in the deployed app.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PageContainer variant="settings" className="gap-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        backHref="/ajustes"
        backLabel="Ajustes"
        meta={copy.meta}
      />

      {/* Verdict ------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{copy.verdict}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          <p className="pb-4 text-sm/relaxed text-muted-foreground">
            {copy.verdictNote}
          </p>
          {scenarios.map((scenario) => {
            const verdict = verdictFor(scenario);
            return (
              <Row key={scenario.key} label={scenario.inputs}>
                <VerdictLine
                  verdict={verdict}
                  action={
                    verdict.teamId
                      ? { label: "Ver time", href: "/times" }
                      : null
                  }
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {scenario.label} · status{" "}
                  <code className="font-mono">{verdict.status}</code>
                </p>
              </Row>
            );
          })}
        </CardContent>
      </Card>

      {/* Semaphore ----------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{copy.semaphore}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          <p className="pb-4 text-sm/relaxed text-muted-foreground">
            {copy.semaphoreNote}
          </p>
          <Row label="StatusPill — status de orçamento">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status="green" />
              <StatusPill status="amber" />
              <StatusPill status="red" />
              <StatusPill status="collecting" />
            </div>
          </Row>
          <Row label="StateBadge — os quatro tons">
            <div className="flex flex-wrap items-center gap-2">
              {badgeTones.map(({ tone, label }) => (
                <StateBadge key={tone} tone={tone} icon={RiCheckboxCircleFill}>
                  {label}
                </StateBadge>
              ))}
            </div>
          </Row>
          <Row label="Com rótulo próprio">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status="green" label="Conectado" />
              <StatusPill status="red" label="Erro na sincronização" />
              <StateBadge tone="neutral" icon={RiTimeFill}>
                Sem custo apurado
              </StateBadge>
            </div>
          </Row>
        </CardContent>
      </Card>

      {/* Budget bar ---------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{copy.bar}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          <p className="pb-4 text-sm/relaxed text-muted-foreground">
            {copy.barNote}
          </p>
          {barCases.map((barCase) => {
            const geometry = barGeometry(barCase.pctSpent, barCase.pctProjected);
            return (
              <Row key={barCase.label} label={barCase.label}>
                <BudgetBar
                  pctSpent={barCase.pctSpent}
                  pctProjected={barCase.pctProjected}
                  status={barCase.status}
                />
                <p className="mt-2 font-mono text-xs tabular-nums text-muted-foreground">
                  gasto {percent(barCase.pctSpent, 0)} · projeção{" "}
                  {barCase.pctProjected === null
                    ? "—"
                    : percent(barCase.pctProjected, 0)}{" "}
                  · linha do orçamento em{" "}
                  {geometry.marker < 1
                    ? percent(geometry.marker, 1)
                    : "borda (oculta)"}
                </p>
              </Row>
            );
          })}
        </CardContent>
      </Card>

      {/* Notices ------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{copy.notices}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          <p className="pb-4 text-sm/relaxed text-muted-foreground">
            {copy.noticesNote}
          </p>
          <Row label="Notice — neutro">
            <Notice icon={<RiInformationLine />} title="Conciliação">
              O total da empresa é a soma dos times mais {money(1840)} sem
              atribuição.
            </Notice>
          </Row>
          <Row label="Notice — âmbar">
            <Notice
              tone="amber"
              icon={<RiErrorWarningLine />}
              title="Câmbio indisponível"
            >
              A taxa do início do período não foi capturada — o gasto de API
              aparece em dólar, sem conversão.
            </Notice>
          </Row>
          <Row label="Notice — destrutivo">
            <Notice
              tone="destructive"
              icon={<RiErrorWarningLine />}
              title="Sincronização falhando"
            >
              A chave Admin da OpenAI foi recusada nas últimas três execuções.
            </Notice>
          </Row>
          {freshnessCases.map((item) => (
            <Row key={item.label} label={`StaleBanner — ${item.label}`}>
              <div className="w-64 max-w-full">
                <StaleBanner items={item.items} />
              </div>
            </Row>
          ))}
        </CardContent>
      </Card>

      {/* Screen states ------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{copy.screens}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          <p className="pb-4 text-sm/relaxed text-muted-foreground">
            {copy.screensNote}
          </p>
          <Row label="Cold start — sem provedor">
            <EmptyState
              icon={<RiPlugLine />}
              title="Nenhum provedor conectado"
              description="Conecte OpenAI ou Anthropic para começar a ver o gasto em dinheiro."
              primaryAction={<Link href="/ajustes/conexoes">Conectar provedores</Link>}
            />
          </Row>
          <Row label="Sem times">
            <EmptyState
              icon={<RiGroupLine />}
              title="Nenhum time ainda"
              description="Importe o roster para ver seus setores aqui, ou conecte os provedores para começar a atribuir o gasto."
              primaryAction={<Link href="/ajustes/roster">Importar roster</Link>}
              secondaryAction={<Link href="/ajustes/conexoes">Conectar provedores</Link>}
            />
          </Row>
          <Row label="Sem orçamento definido">
            <EmptyState
              icon={<RiBarChartLine />}
              title="Nenhum orçamento definido"
              description="Sem um orçamento não há veredicto — defina o da empresa para o mês começar a ser avaliado."
              primaryAction={<Link href="/ajustes/orcamentos">Definir orçamento</Link>}
            />
          </Row>
          <Row label="ActionStatus — erro e sucesso">
            <div className="flex flex-col gap-2">
              <ActionStatus error="O orçamento precisa ser maior que zero." />
              <ActionStatus success="Orçamento salvo." />
            </div>
          </Row>
          <Row label="Carregando (streaming RSC)">
            <TableCardSkeleton rows={3} />
          </Row>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
