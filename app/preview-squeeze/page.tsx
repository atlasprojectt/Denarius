import { Hero } from "@/app/(app)/_components/hero";
import type { BudgetEvaluation } from "@/lib/engine/budget";

// TEMPORARY check: squeezed hero header (12/12) on the neutral frame.
// Deleted after measuring; never merged.
const org: BudgetEvaluation = {
  budget: 2300,
  spent: 1956.67,
  projection: 2410,
  currentMargin: 343.33,
  projectedMargin: -110,
  pctSpent: 0.85,
  pctElapsed: 0.4,
  collecting: false,
  breached: false,
  projectedBreach: true,
};

export default function PreviewSqueezePage() {
  return (
    <div className="min-h-svh bg-background p-6">
      <div data-audit="hero" className="home-cockpit max-w-2xl">
        <Hero
          org={org}
          pctProjected={1.048}
          unconvertedUsd={0}
          currency="BRL"
          dayOfPeriod={12}
          daysInPeriod={30}
          weekPct={0.08}
        />
      </div>
    </div>
  );
}
