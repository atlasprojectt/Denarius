import type { Budget } from "@/lib/budgets/queries";
import type { Team } from "@/lib/teams/queries";

/** One editable line of the batch budget form: the company, then each team. */
export type BudgetTableRow = {
  key: string;
  label: string;
  existing: { id: string; amount: number; warnPct: number } | null;
};

/** Warn threshold as a whole percent for the form (the sub-100% crossing). */
function warnPctOf(budget: Budget): number {
  const warn = budget.thresholds.find((t) => t > 0 && t < 1);
  return warn ? Math.round(warn * 100) : 80;
}

function toExisting(budget: Budget | undefined): BudgetTableRow["existing"] {
  if (!budget) return null;
  return { id: budget.id, amount: budget.amount, warnPct: warnPctOf(budget) };
}

/** Shared by Ajustes → Orçamentos and the guided setup, so both edit the
 *  same rows with the same defaults. */
export function budgetTableRows(
  org: Budget | null,
  teamBudgets: Budget[],
  teams: Team[],
  orgLabel: string,
): BudgetTableRow[] {
  const budgetByTeam = new Map(teamBudgets.map((b) => [b.teamId, b]));
  return [
    { key: "org", label: orgLabel, existing: toExisting(org ?? undefined) },
    ...teams.map((team) => ({
      key: `team:${team.id}`,
      label: team.name,
      existing: toExisting(budgetByTeam.get(team.id)),
    })),
  ];
}
