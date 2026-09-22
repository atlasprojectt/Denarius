import { TeamBudgetTable } from "@/components/domain/team-budget-table";
import type { CockpitTeam } from "@/lib/engine/cockpit";

// TEMPORARY check: neutral frame border + manage-button hover utility.
// Deleted after measuring; never merged.
const teams: CockpitTeam[] = [
  {
    teamId: "eng",
    teamName: "Engenharia",
    evaluation: {
      budget: 1200,
      spent: 1080,
      projection: 1350,
      currentMargin: 120,
      projectedMargin: -150,
      pctSpent: 0.9,
      pctElapsed: 0.4,
      collecting: false,
      breached: false,
      projectedBreach: true,
    },
    pctProjected: 1.125,
    finding: null,
    status: "amber",
    warnPct: 80,
  },
];

export default function PreviewBordersPage() {
  return (
    <div className="min-h-svh bg-background p-6">
      <div data-audit="teams" className="home-cockpit max-w-2xl">
        <TeamBudgetTable
          teams={teams}
          attentionCount={1}
          currency="BRL"
        />
      </div>
    </div>
  );
}
