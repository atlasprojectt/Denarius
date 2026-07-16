"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RiArrowRightSLine } from "@remixicon/react";

import { BudgetBar } from "@/components/domain/budget-bar";
import { StatusPill } from "@/components/domain/status-pill";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
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
// links to /times?focus=<id> (the team's diagnosis card, expanded) and
// "Gerenciar orçamentos" → /ajustes/orcamentos (editing). All numbers are
// engine-provided; this component only formats them.
//
// Layout is chosen by the `variant` prop, not by width:
//   - "responsive" (default, /times): container-query based (@container on
//     CardContent) — full-width shows the table, a narrow container falls back
//     to the compact card list.
//   - "table" (Home): always the table, even in Home's half-width grid cell.
//     Home must not flip design as the window resizes, so the width-dependent
//     compact fallback is dropped and the Orçamento/Projeção columns show
//     unconditionally; only the wide Consumo (usage-bar) column stays
//     container-gated so the table stays readable when the cell is narrow.

// Copy (F2: pt-BR, isolated). Owned here now that the table is a cross-screen
// domain component rather than a Home-only piece.
const c = {
  title: "Orçamentos por time",
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

export function TeamBudgetTable({
  teams,
  attentionCount,
  currency,
  variant = "responsive",
}: {
  /** Every budgeted team, needs-attention first (cockpit ordering). */
  teams: CockpitTeam[];
  attentionCount: number;
  currency: string;
  /** "table" forces the table at every width (Home); "responsive" flips to the
   *  compact list in a narrow container (/times). */
  variant?: "responsive" | "table";
}) {
  const router = useRouter();
  const forceTable = variant === "table";
  // Columns that are container-gated in "responsive" mode but always visible
  // when the table is forced (so Home's half-width cell still shows them).
  const optionalColHead = forceTable ? "text-right" : "hidden text-right @2xl:table-cell";
  const optionalColCell = forceTable
    ? "text-right tabular-nums text-muted-foreground"
    : "hidden text-right tabular-nums text-muted-foreground @2xl:table-cell";

  return (
    // min-h-full is Home-only (variant="table"): the 2x2 grid cell stretches
    // the card. On /times the page column is a definite-height flex chain
    // (min-h-svh → flex-1), so a percentage min-height makes THIS card absorb
    // the viewport height and flex-shrink squash its siblings — the
    // "Times sem orçamento" card collapsed to its header (overflow-hidden
    // disables the min-content floor). Natural height in "responsive" mode.
    <Card className={forceTable ? "min-h-full" : undefined}>
      <CardHeader>
        <CardTitle className="text-sm">{c.title}</CardTitle>
        <CardDescription>
          {teams.length === 0
            ? c.emptyBody
            : attentionCount > 0
              ? c.subtitleAttention(attentionCount, teams.length)
              : c.subtitleAllOk(teams.length)}
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <Link href="/ajustes/orcamentos">
              {teams.length === 0 ? c.emptyCta : c.manage}
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      {teams.length > 0 && (
        <CardContent className="@container">
          {!forceTable && (
          <div className="grid gap-2 @2xl:hidden">
            {teams.map((team) => {
              const ev = team.evaluation;
              const warning = warningLine(team, currency);
              return (
                <Link
                  key={team.teamId}
                  href={`/times?focus=${team.teamId}`}
                  aria-label={c.detail(team.teamName)}
                  className="group rounded-lg border p-3 outline-none transition-colors hover:border-primary-hover/40 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{team.teamName}</p>
                      {warning && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {warning}
                        </p>
                      )}
                    </div>
                    <StatusPill status={team.status} />
                  </div>
                  <dl className="mt-2.5 grid grid-cols-3 gap-2 text-[11px] leading-relaxed">
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
                      animate
                      className="h-2 flex-1"
                      pctSpent={ev.pctSpent}
                      pctProjected={team.pctProjected}
                      status={team.status}
                    />
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {percent(ev.pctSpent)}
                    </span>
                    <RiArrowRightSLine className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
          )}
          <div className={forceTable ? "block" : "hidden @2xl:block"}>
          <Table>
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
                const warning = warningLine(team, currency);
                return (
                  <TableRow
                    key={team.teamId}
                    role="link"
                    tabIndex={0}
                    aria-label={c.detail(team.teamName)}
                    className="group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30"
                    onClick={() => router.push(`/times?focus=${team.teamId}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/times?focus=${team.teamId}`);
                      }
                    }}
                  >
                    <TableCell className="max-w-64">
                      <span className="block truncate font-medium transition-colors group-hover:text-primary-hover">
                        {team.teamName}
                      </span>
                      {warning && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {warning}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={team.status} />
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
                          animate
                          className="h-2 flex-1"
                          pctSpent={ev.pctSpent}
                          pctProjected={team.pctProjected}
                          status={team.status}
                        />
                        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
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
                      <RiArrowRightSLine className="ml-auto size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
