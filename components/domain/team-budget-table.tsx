"use client";

import Link from "next/link";
import { RiArrowRightSLine, RiTeamLine } from "@/components/domain/icons";

import { BudgetBar } from "@/components/domain/budget-bar";
import { StatusPill } from "@/components/domain/status-pill";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
  CockpitCard,
  CockpitCardContent,
  CockpitCardFrame,
  CockpitCardHeader,
  CockpitCardTitle,
} from "@/components/domain/cockpit-card";
import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CockpitTeam } from "@/lib/engine/cockpit";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";

// The teams section (frontend §3.5, redesign 2026-07): ONE stable table for
// every budgeted team, at-risk first — no expanding rows, no collapsed groups,
// no inline dialogs. Shared by Home and the Times tab (§F5 domain component).
// The row states the situation; acting on it lives in dedicated routes: the row
// links to /times/<id> (the team's dedicated diagnosis) and
// "Gerenciar orçamentos" → /ajustes/orcamentos (editing). All numbers are
// engine-provided; this component only formats them.
//
// The component follows its own width through the existing container query:
// wide cards show the table; narrow cards (including Home on a phone) show the
// compact list. A wide table therefore never expands the page viewport.

// Copy (F2: pt-BR, isolated). Owned here now that the table is a cross-screen
// domain component rather than a Home-only piece.
const c = {
  title: "Orçamento dos times",
  subtitleAttention: (n: number, total: number) =>
    n === 1
      ? `1 de ${total} times precisa de atenção neste mês.`
      : `${n} de ${total} times precisam de atenção neste mês.`,
  subtitleAllOk: (total: number) =>
    total === 1
      ? "O único time com orçamento está dentro do ritmo."
      : `Todos os ${total} times com orçamento estão dentro do ritmo.`,
  manage: "Gerenciar orçamentos",
  colTeam: "Time",
  colStatus: "Situação",
  colSpent: "Gasto",
  colBudget: "Orçamento",
  colUsage: "Consumo",
  colProjection: "Projeção",
  detail: (team: string) => `Ver detalhe de ${team}`,
  collecting: "—",
  warnBreach: (spent: string, budget: string, pct: string) =>
    `Estourou o orçamento: ${spent} de ${budget} (${pct}).`,
  warnProjected: (projection: string, over: string) =>
    `No ritmo atual, fecha em ${projection} — ${over} acima do orçamento.`,
  warnThreshold: (pct: string) => `Já em ${pct} do orçamento neste ponto do mês.`,
  emptyBody:
    "Defina orçamentos por time para ver aqui quem está dentro do ritmo e quem precisa de atenção.",
  emptyCta: "Definir orçamentos por time",
} as const;

function warningLine(team: CockpitTeam, currency: string): string | null {
  const f = team.finding;
  if (f === null) return null;
  const ev = team.evaluation;
  if (f.level === "breach") {
    return c.warnBreach(
      money(ev.spent, currency),
      money(ev.budget, currency),
      percent(ev.pctSpent),
    );
  }
  if (f.level === "projected_breach" && ev.projection !== null) {
    const over = money(ev.projection - ev.budget, currency);
    return c.warnProjected(money(ev.projection, currency), over);
  }
  return c.warnThreshold(percent(ev.pctSpent));
}

function TeamStatus({ team, currency }: { team: CockpitTeam; currency: string }) {
  const reason = warningLine(team, currency);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusPill status={team.status} />
      {reason !== null && <span className="text-xs text-muted-foreground">{reason}</span>}
    </span>
  );
}

export function TeamBudgetTable({
  teams,
  attentionCount,
  currency,
}: {
  /** Every budgeted team, needs-attention first (cockpit ordering). */
  teams: CockpitTeam[];
  attentionCount: number;
  currency: string;
}) {
  const optionalColHead = "hidden text-right @2xl:table-cell";
  const optionalColCell =
    "hidden text-right tabular-nums text-muted-foreground @2xl:table-cell";

  return (
    // `min-h-full` makes the card fill its grid cell so it ends on the same line
    // as the pace chart beside it (Home's responsive cockpit stretches its row); the
    // scroller below keeps a long roster inside that height instead of pushing
    // past the row into the observations footer. `xl:h-full` locks it to the
    // constrained grid track so the page stays fixed and only this list scrolls.
    <CockpitCard className="min-h-full xl:h-full">
      <CockpitCardHeader className="min-h-10 justify-between gap-2">
        <div className="min-w-0">
          <CockpitCardTitle id="team-budget-title" className="flex items-center gap-2">
            <RiTeamLine className="size-4 text-muted-foreground" aria-hidden />
            {c.title}
          </CockpitCardTitle>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="h-11 shrink-0 sm:h-7"
          asChild
        >
          <Link href="/ajustes/orcamentos">
            {teams.length === 0 ? c.emptyCta : c.manage}
          </Link>
        </Button>
      </CockpitCardHeader>
      <CockpitCardFrame>
      <CockpitCardContent className="@container flex min-h-0 flex-1 flex-col">
          <CardDescription className="mb-3 text-xs text-content-supporting">
            {teams.length === 0
              ? c.emptyBody
              : attentionCount > 0
                ? c.subtitleAttention(attentionCount, teams.length)
                : c.subtitleAllOk(teams.length)}
          </CardDescription>
        {teams.length > 0 && (
          <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-2 @2xl:hidden">
            {teams.map((team) => {
              const ev = team.evaluation;
              return (
                <Link
                  key={team.teamId}
                  href={`/times/${team.teamId}`}
                  aria-label={c.detail(team.teamName)}
                  className="group min-h-11 rounded-standard border p-3 outline-none transition-colors hover:border-border hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate font-medium">{team.teamName}</p>
                    <TeamStatus team={team} currency={currency} />
                  </div>
                    <dl className="mt-2.5 grid grid-cols-3 gap-2 text-xs leading-relaxed">
                    <div>
                      <dt className="text-muted-foreground">{c.colSpent}</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {money(ev.spent, currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{c.colBudget}</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {money(ev.budget, currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{c.colProjection}</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {ev.projection === null ? c.collecting : money(ev.projection, currency)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-2.5 flex items-center gap-2.5">
                    <BudgetBar
                      className="h-2 flex-1"
                      pctSpent={ev.pctSpent}
                      pctProjected={team.pctProjected}
                      status={team.status}
                    />
                    <span className="text-xs font-light tabular-nums text-muted-foreground">
                      {percent(ev.pctSpent)}
                    </span>
                    <RiArrowRightSLine className="size-4 text-muted-foreground transition-transform duration-(--motion-duration-fast) ease-(--motion-ease-standard) group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="hidden @2xl:block">
          <Table aria-labelledby="team-budget-title" className="[&_th]:text-muted-foreground">
            <TableCaption className="sr-only">Orçamentos, gasto, situação e projeção de cada time.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{c.colTeam}</TableHead>
                <TableHead>{c.colStatus}</TableHead>
                <TableHead className="text-right">{c.colSpent}</TableHead>
                <TableHead className={optionalColHead}>{c.colBudget}</TableHead>
                <TableHead className="hidden w-44 @3xl:table-cell">
                  {c.colUsage}
                </TableHead>
                <TableHead className={optionalColHead}>{c.colProjection}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => {
                const ev = team.evaluation;
                return (
                  <TableRow
                    key={team.teamId}
                    className="group border-border"
                  >
                    <TableCell className="max-w-64">
                      <Link
                        href={`/times/${team.teamId}`}
                        aria-label={c.detail(team.teamName)}
                        className="relative z-10 block truncate font-medium outline-none after:absolute after:inset-0 after:z-[-1] after:w-[calc(100vw-2rem)] after:max-w-[calc(100%+1000px)] after:rounded-md after:transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        {team.teamName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <TeamStatus team={team} currency={currency} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(ev.spent, currency)}
                    </TableCell>
                    <TableCell className={optionalColCell}>
                      {money(ev.budget, currency)}
                    </TableCell>
                    <TableCell className="hidden @3xl:table-cell">
                      <div className="flex items-center gap-2.5">
                        <BudgetBar
                          className="h-2 flex-1"
                          pctSpent={ev.pctSpent}
                          pctProjected={team.pctProjected}
                          status={team.status}
                        />
                        <span className="w-10 shrink-0 text-right text-xs font-light tabular-nums text-muted-foreground">
                          {percent(ev.pctSpent)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={optionalColCell}>
                      {ev.projection === null
                        ? c.collecting
                        : money(ev.projection, currency)}
                    </TableCell>
                    <TableCell className="p-0 pr-2 text-right">
                      <RiArrowRightSLine className="ml-auto size-4 text-muted-foreground transition-transform duration-(--motion-duration-fast) ease-(--motion-ease-standard) group-hover:translate-x-0.5" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
          </div>
        )}
        </CockpitCardContent>
      </CockpitCardFrame>
    </CockpitCard>
  );
}
