import Link from "next/link";
import { RiArrowRightSLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Times without a budget (§F5, Times tab): the sectors the verdict can't speak
// for yet. Semaphore is reserved for budget status (P5), so these rows carry no
// pill — just their combined spend and a nudge to set a budget. Numbers are
// engine-provided and formatted upstream; this is a pure presenter. Rows link to
// the same /times/[id] detail (contributors render even without a budget).

const copy = {
  title: "Times sem orçamento",
  subtitle:
    "Setores ainda sem orçamento definido. Defina um para acompanhar o veredito e receber avisos.",
  cta: "Definir orçamentos",
  footnote:
    "Gasto combinado: assentos + API convertida no câmbio congelado do período.",
  detail: (team: string) => `Ver detalhe de ${team}`,
};

export type UnbudgetedTeam = {
  id: string;
  name: string;
  /** Combined spend, display currency, already formatted upstream. */
  spend: string;
  /** Disclosure (e.g. FX missing) or zero-spend note. */
  note?: string;
  /** Row destination — defaults to the team detail; the unattributed bucket
   *  points at Atribuição instead. */
  href?: string;
};

export function UnbudgetedTeams({ teams }: { teams: UnbudgetedTeam[] }) {
  if (teams.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{copy.title}</CardTitle>
        <CardDescription>{copy.subtitle}</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <Link href="/ajustes/orcamentos">{copy.cta}</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {teams.map((team) => (
          <Link
            key={team.id}
            href={team.href ?? `/times/${team.id}`}
            aria-label={copy.detail(team.name)}
            className="group flex items-center gap-3 py-3 outline-none first:pt-0 last:pb-0 focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium transition-colors group-hover:text-primary-hover">
                {team.name}
              </p>
              {team.note && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {team.note}
                </p>
              )}
            </div>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {team.spend}
            </span>
            <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </CardContent>
      <CardFooter className="text-xs/relaxed text-muted-foreground">
        <p>{copy.footnote}</p>
      </CardFooter>
    </Card>
  );
}
