import type { Cockpit } from "@/lib/engine/cockpit";
import type { ThresholdLevel } from "@/lib/engine/thresholds";
import {
  buildBudgetThresholdFinding,
  orderFindings,
  type BudgetThresholdFinding,
} from "@/lib/findings/budget-threshold";
import { percent, signedPercent } from "@/lib/format";
import { money } from "@/lib/money";

// The badge above each item already names the event (limit reached, projected
// risk, breached), so the title is the scope plus its figure.
const copy = {
  share: (scope: string, pct: string) => `${scope}: ${pct} do orçamento`,
  projected: (scope: string, delta: string) =>
    `${scope}: projeção ${delta} X orçamento`,
  breach: (scope: string, delta: string) => `${scope}: gasto ${delta} X orçamento`,
  projectionDetail: (projection: string, budget: string) =>
    `Projeção ${projection} X orçamento ${budget}`,
  spentDetail: (spent: string, budget: string) =>
    `Gasto ${spent} X orçamento ${budget}`,
};

export type BudgetNotification = {
  id: string;
  title: string;
  detail: string;
  href: string;
  level: ThresholdLevel;
};

export type NotificationTriggerTone = "amber" | "destructive" | null;

/** Compact visual count for the icon-only header trigger; aria copy keeps the
 * exact number, so this cap is presentation only. */
export function compactNotificationCount(count: number): string {
  return count > 9 ? "9+" : String(Math.max(0, count));
}

/** The trigger reflects only the worst active budget status. The button shell
 * stays neutral; this tone is applied to its small count badge. */
export function notificationTriggerTone(
  items: BudgetNotification[],
): NotificationTriggerTone {
  if (items.some((item) => item.level === "breach")) return "destructive";
  return items.length > 0 ? "amber" : null;
}

/** "+20%", with enough precision that a real overrun never reads as zero. */
function overrunPercent(fraction: number): string {
  for (const digits of [0, 1, 2]) {
    if (Math.round(fraction * 100 * 10 ** digits) > 0) {
      return signedPercent(fraction, digits);
    }
  }
  return percent(0);
}

export function budgetNotificationFromFinding(
  finding: BudgetThresholdFinding,
): BudgetNotification {
  const { currency, level, numbers, targetId, targetName } = finding;
  const overFraction =
    numbers.budget > 0
      ? level === "projected_breach" && numbers.projection !== null
        ? Math.max(0, numbers.projection / numbers.budget - 1)
        : Math.max(0, numbers.pctSpent - 1)
      : 0;

  // A breach below display granularity states the share reached, never "+0%".
  const title =
    level === "projected_breach"
      ? copy.projected(targetName, overrunPercent(overFraction))
      : level === "breach" && overFraction > 0
        ? copy.breach(targetName, overrunPercent(overFraction))
        : copy.share(targetName, percent(numbers.pctSpent));

  const budget = money(numbers.budget, currency);
  const detail =
    level === "projected_breach" && numbers.projection !== null
      ? copy.projectionDetail(money(numbers.projection, currency), budget)
      : copy.spentDetail(money(numbers.spent, currency), budget);

  return {
    id: `budget:${targetId ?? "org"}:${level}`,
    title,
    detail,
    href: targetId === null ? "/" : `/times/${targetId}`,
    level,
  };
}

/**
 * Active budget alerts for the global notification center. Findings remain
 * stateless: the count is active alerts, never unread messages.
 */
export function buildBudgetNotifications(
  cockpit: Cockpit,
): BudgetNotification[] {
  if (cockpit.state !== "ready") return [];

  const orgFinding = buildBudgetThresholdFinding({
    scope: "org",
    targetId: null,
    targetName: "Empresa",
    evaluation: cockpit.org,
    thresholds: [cockpit.orgWarnPct / 100, 1],
    currency: cockpit.currency,
  });
  const teamFindings = cockpit.needsAttention.flatMap((team) =>
    team.finding === null ? [] : [team.finding],
  );
  const findings = orgFinding
    ? orderFindings([...teamFindings, orgFinding])
    : orderFindings(teamFindings);

  return findings.map(budgetNotificationFromFinding);
}
