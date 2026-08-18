import type { Cockpit } from "@/lib/engine/cockpit";
import type { ThresholdLevel } from "@/lib/engine/thresholds";
import {
  buildBudgetThresholdFinding,
  orderFindings,
  type BudgetThresholdFinding,
} from "@/lib/findings/budget-threshold";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";

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

function positivePercent(fraction: number): string {
  for (const digits of [0, 1, 2]) {
    if (Math.round(fraction * 100 * 10 ** digits) > 0) {
      return percent(fraction, digits);
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

  const title =
    level === "warning"
      ? `${targetName} atingiu ${percent(numbers.pctSpent)} do orçamento`
      : level === "projected_breach"
        ? `${targetName} pode fechar ${positivePercent(overFraction)} acima do orçamento`
        : overFraction > 0
          ? `${targetName} estourou o orçamento em ${positivePercent(overFraction)}`
          : `${targetName} atingiu o limite do orçamento`;

  const detail =
    level === "projected_breach" && numbers.projection !== null
      ? `Projeção de ${money(numbers.projection, currency)} para um orçamento de ${money(numbers.budget, currency)}`
      : `${money(numbers.spent, currency)} gastos de ${money(numbers.budget, currency)}`;

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
