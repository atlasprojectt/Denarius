"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RiArrowRightSLine, RiTeamLine } from "@remixicon/react";

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

// The status pill; for at-risk teams it carries the full reason in a tooltip
// (de-noise 2026-07-17): the chip is the resting signal, the sentence is one
// hover/focus away, so the same detail no longer sits permanently under every
// team name. When there is no finding the pill renders bare.
function TeamStatus({ team, currency }: { team: CockpitTeam; currency: string }) {
  const reason = warningLine(team, currency);
  if (reason === null) return <StatusPill status={team.status} />;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-label={reason}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          // The row is itself a link; stop the pill's click from navigating so
          // a tap on the chip reveals the reason instead of leaving the page.
          onClick={(event) => event.stopPropagation()}
        >
          <StatusPill status={team.status} />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs/relaxed">
          {reason}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
  const router = useRouter();
  const optionalColHead = "hidden text-right @2xl:table-cell";
  const optionalColCell =
    "hidden text-right tabular-nums text-muted-foreground @2xl:table-cell";

  return (
    // `min-h-full` makes the card fill its grid cell so it ends on the same line
    // as the pace chart beside it (Home's 2x2 cockpit stretches its row); the
    // scroller below keeps a long roster inside that height instead of pushing
    // past the row into the observations footer.
    <Card className="min-h-full">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm">
          <RiTeamLine className="size-4 text-muted-foreground" aria-hidden />
          {c.title}
        </CardTitle>
        <CardDescription>
          {teams.length === 0
            ? c.emptyBody
            : attentionCount > 0
              ? c.subtitleAttention(attentionCount, teams.length)
              : c.subtitleAllOk(teams.length)}
        </CardDescription>
        <CardAction className="col-start-1 row-start-3 mt-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end">
          <Button
            variant="secondary"
            size="sm"
            className="h-11 sm:h-7"
            asChild
          >
            <Link href="/ajustes/orcamentos">
              {teams.length === 0 ? c.emptyCta : c.manage}
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      {teams.length > 0 && (
        <CardContent className="@container flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-2 @2xl:hidden">
            {teams.map((team) => {
              const ev = team.evaluation;
              return (
                <Link
                  key={team.teamId}
                  href={`/times/${team.teamId}`}
                  aria-label={c.detail(team.teamName)}
                  className="group min-h-11 rounded-lg border p-3 outline-none transition-colors hover:border-border hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate font-medium">{team.teamName}</p>
                    <TeamStatus team={team} currency={currency} />
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
                      className="h-2 flex-1"
                      pctSpent={ev.pctSpent}
                      pctProjected={team.pctProjected}
                      status={team.status}
                    />
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {percent(ev.pctSpent)}
                    </span>
                    <RiArrowRightSLine className="size-4 text-muted-foreground transition-transform duration-(--motion-duration-fast) ease-(--motion-ease-standard) group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="hidden @2xl:block">
          <Table className="[&_th]:text-muted-foreground">
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
                    role="link"
                    tabIndex={0}
                    aria-label={c.detail(team.teamName)}
                    className="group cursor-pointer border-border outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
                    onClick={() => router.push(`/times/${team.teamId}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/times/${team.teamId}`);
                      }
                    }}
                  >
                    <TableCell className="max-w-64">
                      <span className="block truncate font-medium transition-colors group-hover:text-foreground">
                        {team.teamName}
                      </span>
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
                      <RiArrowRightSLine className="ml-auto size-4 text-muted-foreground transition-transform duration-(--motion-duration-fast) ease-(--motion-ease-standard) group-hover:translate-x-0.5" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
