import "server-only";

import { activeLevels, type ThresholdLevel } from "@/lib/engine/thresholds";
import { monthStartUtc } from "@/lib/engine/period";
import { buildBudgetThresholdFinding } from "@/lib/findings/budget-threshold";
import { dbFailure, logFailure, logSkipped } from "@/lib/logging/server-log";
import { createAdminClient } from "@/lib/supabase/admin";

import type { NotificationChannel } from "./channel";
import { planAlert } from "./plan";
import { alertRecipients } from "./recipients";
import { appBaseUrl, renderAlertEmail } from "./render";
import { ORG_TARGET, tenantSnapshot } from "./snapshot";

// Event alerts for ONE tenant (issue #20): evaluate every budgeted scope,
// apply the once-per-(target, level, period) dedup via notification_log, and
// email Admins about newly-crossed thresholds. Runs inside the daily cron
// after sync — the deliberate cross-tenant path — one tenant at a time.

export type AlertRunResult = {
  tenantId: string;
  /** Emails delivered (one per scope with a new crossing). */
  sent: number;
  /** Deliveries attempted and failed — not logged, so they retry next run. */
  failed: number;
  /** Crossings found but delivery impossible (no channel / no recipients). */
  undeliverable: number;
};

type LogRow = { target_id: string; level: string };

function logKey(targetId: string | null): string {
  return targetId ?? ORG_TARGET;
}

export async function sendBudgetAlerts(
  tenantId: string,
  channel: NotificationChannel | null,
  now: Date = new Date(),
): Promise<AlertRunResult> {
  const result: AlertRunResult = { tenantId, sent: 0, failed: 0, undeliverable: 0 };
  const snapshot = await tenantSnapshot(tenantId, now);
  if (snapshot.scopes.length === 0) return result;

  const admin = createAdminClient();
  const periodMonth = monthStartUtc(now);
  const { data: logData, error: readError } = await admin
    .from("notification_log")
    .select("target_id, level")
    .eq("tenant_id", tenantId)
    .eq("channel", "email")
    .eq("period_month", periodMonth);
  if (readError) {
    logFailure("notify.alert_log", tenantId, {
      step: "read",
      ...dbFailure(readError),
    });
    // Without the dedup state, sending could repeat an alert the customer
    // already received. Fail closed and try again on the next cron run.
    result.failed = 1;
    return result;
  }

  const sentByTarget = new Map<string, ThresholdLevel[]>();
  for (const row of (logData ?? []) as LogRow[]) {
    const list = sentByTarget.get(row.target_id) ?? [];
    list.push(row.level as ThresholdLevel);
    sentByTarget.set(row.target_id, list);
  }

  const recipients = alertRecipients(snapshot.users);
  const appUrl = appBaseUrl();

  for (const scope of snapshot.scopes) {
    const plan = planAlert(
      activeLevels(scope.evaluation, scope.thresholds),
      sentByTarget.get(logKey(scope.targetId)) ?? [],
    );
    if (plan.emailLevel === null) continue;

    // A crossing exists but there is no way to deliver it: do NOT record the
    // log — the alert must fire on the first run after email is configured.
    if (channel === null || recipients.length === 0) {
      // Recorded, because "no alert was sent" and "no threshold was crossed"
      // look identical from the outside, and only one of them is a problem.
      logSkipped("notify.alert", tenantId, {
        scope: scope.scope,
        level: plan.emailLevel,
        reason: channel === null ? "no channel configured" : "no recipients",
      });
      result.undeliverable += 1;
      continue;
    }

    const finding = buildBudgetThresholdFinding({
      scope: scope.scope,
      targetId: scope.targetId,
      targetName: scope.targetName,
      evaluation: scope.evaluation,
      thresholds: scope.thresholds,
      driverInputs: scope.scope === "org" ? snapshot.teamSpendDrivers : [],
      currency: snapshot.currency,
    });
    if (finding === null) continue; // defensive: plan implies an active level

    const sendResult = await channel.send(
      renderAlertEmail({
        finding,
        to: recipients,
        appUrl,
        periodEndLabel: snapshot.periodEndLabel,
      }),
    );
    if (!sendResult.ok) {
      logFailure("notify.alert", tenantId, {
        scope: scope.scope,
        level: plan.emailLevel,
        reason: sendResult.error,
      });
      result.failed += 1;
      continue;
    }

    // Log every newly-crossed level (the email carries the most severe one).
    // ignoreDuplicates keeps a retried run idempotent under the unique key.
    const { error: logError } = await admin.from("notification_log").upsert(
      plan.logLevels.map((level) => ({
        tenant_id: tenantId,
        channel: "email",
        target_id: logKey(scope.targetId),
        level,
        period_month: periodMonth,
      })),
      {
        onConflict: "tenant_id,channel,target_id,level,period_month",
        ignoreDuplicates: true,
      },
    );
    // A failed log after a successful send means a possible duplicate next
    // run — acceptable; the alternative (log first) could silence a real
    // alert that was never delivered.
    if (logError) {
      // The e-mail went out; the dedup row did not. Worth a line: the next run
      // may send it again, and nothing else records why.
      logFailure("notify.alert_log", tenantId, {
        scope: scope.scope,
        ...dbFailure(logError),
      });
      result.failed += 1;
    } else {
      result.sent += 1;
    }
  }

  return result;
}
