import Link from "next/link";
import { IconChevronRight } from "@tabler/icons-react";

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
import { homeCopy } from "./copy";

// The teams section (frontend §3.5, redesign 2026-07): ONE stable table for
// every budgeted team, at-risk first — no expanding rows, no collapsed groups,
// no inline dialogs. The row states the situation; acting on it lives in
// dedicated routes: the row links to /explorar/time/[id] (investigation,
// simulation, control plan) and "Gerenciar orçamentos" → /ajustes/orcamentos
// (editing). All numbers are engine-provided; this component only formats them.

const c = homeCopy.teams;

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
}: {
  /** Every budgeted team, needs-attention first (cockpit ordering). */
  teams: CockpitTeam[];
  attentionCount: number;
  currency: string;
}) {
  return (
    <Card>
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{c.colTeam}</TableHead>
                <TableHead>{c.colStatus}</TableHead>
                <TableHead className="text-right">{c.colSpent}</TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  {c.colBudget}
                </TableHead>
                <TableHead className="hidden w-44 lg:table-cell">
                  {c.colUsage}
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  {c.colProjection}
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => {
                const ev = team.evaluation;
                const warning = warningLine(team, currency);
                return (
                  <TableRow key={team.teamId}>
                    <TableCell className="max-w-64">
                      <Link
                        href={`/explorar/time/${team.teamId}`}
                        className="block truncate font-medium transition-colors hover:text-primary"
                      >
                        {team.teamName}
                      </Link>
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
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                      {money(ev.budget, currency)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
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
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                      {ev.projection === null
                        ? c.collecting
                        : money(ev.projection, currency)}
                    </TableCell>
                    <TableCell className="p-0 pr-2 text-right">
                      <Link
                        href={`/explorar/time/${team.teamId}`}
                        aria-label={c.detail(team.teamName)}
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <IconChevronRight className="size-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
