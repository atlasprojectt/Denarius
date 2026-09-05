import {
  currentPeriod,
  monthRange,
  previousMonthOf,
} from "@/lib/engine/period";

import { reportPeriodPath } from "./format";

// Which month the "Fechamento do mês" section talks about (pure, no I/O).
//
// The section is the inbox of the latest official report: the just-ended
// month stays featured for a few days after its snapshot lands, then leaves
// the spotlight and lives only in the history list. Any other time the
// section shows the running month locked, with the date it will unlock.
// Whether the featured file ALSO carries the "Novo" highlight is a
// browser-only concern (`lib/reports/seen.ts`) — server code cannot read the
// seen set, so this function decides featuring from snapshots and dates alone.

/** How long a fresh closing stays featured after the month ends. */
export const FEATURE_DAYS = 5;

const DAY_MS = 86_400_000;

export type ClosingState =
  | { mode: "featured"; periodMonth: string; periodPath: string }
  | {
      mode: "locked";
      periodMonth: string;
      /** Last day of the featured running month ("yyyy-mm-dd"). */
      availableOn: string;
    };

/** @param snapshotMonths `period_month` values already frozen ("yyyy-mm-01"). */
export function closingCardState(
  now: Date,
  snapshotMonths: readonly string[],
): ClosingState {
  const prev = previousMonthOf(now);
  const prevStart = monthRange(prev.year, prev.month).start;
  if (snapshotMonths.includes(prevStart)) {
    // The close counts from the month's last calendar day: available 30/09,
    // still featured 01–04/10, filed away on 05/10. Day counts below are UTC
    // calendar days.
    const { nextStart } = monthRange(prev.year, prev.month);
    const closeDayStart = Date.parse(`${nextStart}T00:00:00.000Z`) - DAY_MS;
    if ((now.getTime() - closeDayStart) / DAY_MS < FEATURE_DAYS) {
      return {
        mode: "featured",
        periodMonth: prevStart,
        periodPath: reportPeriodPath(prevStart),
      };
    }
  }

  const current = currentPeriod(now);
  const { nextStart } = monthRange(current.year, current.month);
  const availableOn = new Date(Date.parse(`${nextStart}T00:00:00.000Z`) - DAY_MS)
    .toISOString()
    .slice(0, 10);
  return {
    mode: "locked",
    periodMonth: current.monthStart,
    availableOn,
  };
}
