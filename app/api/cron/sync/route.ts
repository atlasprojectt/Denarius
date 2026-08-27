import "server-only";

import { NextResponse } from "next/server";

import { monthStartUtc } from "@/lib/engine/period";
import {
  listActiveProviderConnections,
  listBudgetTenantIds,
} from "@/lib/db/admin";
import { dbFailure, logFailure, logOk } from "@/lib/logging/server-log";
import { sendBudgetAlerts } from "@/lib/notify/alerts";
import { emailChannel } from "@/lib/notify/channel";
import { closePeriods } from "@/lib/snapshot/close";
import { runProviderSync, type ProviderName } from "@/lib/sync/provider-sync";

// Daily sync of every tenant's active connections — the one deliberate
// cross-tenant path (architecture §5.1). Vercel Cron hits this route on the
// schedule in vercel.json and sends `Authorization: Bearer $CRON_SECRET`; the
// route runs each tenant's per-provider sync (idempotent upserts, last-sync +
// error recorded on provider_connection), then evaluates event alerts (#20)
// for every tenant with a budget this period — including seats-only tenants
// that have no provider connection. Never returns secrets or payloads.

export const dynamic = "force-dynamic";
// Vercel Hobby caps function duration at 60s. MVP volume (1–3 tenants, a couple
// connections each) syncs well within that; revisit if tenant count grows.
export const maxDuration = 60;

type ConnectionRow = { tenant_id: string; provider: ProviderName };

// Postgres errors arrive as throws with a `.code`; this keeps the dbFailure()
// log lines carrying the same `code` field the PostgREST path logged.
function errorCodeOf(cause: unknown): { code?: string | null } {
  return {
    code: ((cause as { code?: unknown } | null)?.code as string | undefined) ?? null,
  };
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Fail closed: with no secret configured the route is disabled, never open.
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let connections: ConnectionRow[];
  try {
    connections = (await listActiveProviderConnections()) as ConnectionRow[];
  } catch (cause) {
    logFailure("cron.sync", null, dbFailure(errorCodeOf(cause)));
    return NextResponse.json({ error: "could not list connections" }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;
  // Sequential: keeps provider rate limits and DB load predictable; the daily
  // volume is tiny and fits the 60s budget comfortably at MVP scale.
  for (const conn of connections) {
    const result = await runProviderSync(conn.tenant_id, conn.provider);
    if (result.ok) synced += 1;
    else failed += 1;
  }

  // Event alerts run on budgets, not connections: a threshold can be crossed
  // by seat accrual alone, so every tenant budgeted this period is checked.
  let budgetTenants: string[] = [];
  let budgetFailed = false;
  try {
    budgetTenants = [...new Set(await listBudgetTenantIds(monthStartUtc()))];
  } catch (cause) {
    budgetFailed = true;
    logFailure("cron.sync", null, {
      step: "list_budget_tenants",
      ...dbFailure(errorCodeOf(cause)),
    });
  }

  const channel = emailChannel();
  const alerts = { tenants: budgetTenants.length, sent: 0, failed: 0, undeliverable: 0 };
  for (const tenantId of budgetTenants) {
    const result = await sendBudgetAlerts(tenantId, channel);
    alerts.sent += result.sent;
    alerts.failed += result.failed;
    alerts.undeliverable += result.undeliverable;
  }

  // Freeze the previous month once it has ended (#94) — last, so the month
  // being closed is as complete as this run's sync could make it. Idempotent:
  // the (tenant, period_month) unique key absorbs every repeat run.
  const closed = await closePeriods();

  // One line for the run itself. The per-connection outcomes are logged inside
  // runProviderSync, where the tenant and the provider are both in scope; this
  // is the line that says the cron ran at all — which a counter in a response
  // body nobody reads cannot show.
  const summary = {
    connections: connections.length,
    synced,
    failed,
    alertTenants: alerts.tenants,
    alertsSent: alerts.sent,
    alertsFailed: alerts.failed,
    alertsUndeliverable: alerts.undeliverable,
    budgetQueryFailed: budgetFailed,
    snapshotTenants: closed.tenants,
    snapshotsCreated: closed.created,
    snapshotsBackfilled: closed.backfilled,
    snapshotsFailed: closed.failed,
  };
  if (failed > 0 || alerts.failed > 0 || closed.failed > 0 || budgetFailed) {
    logFailure("cron.sync", null, summary);
  } else {
    logOk("cron.sync", null, summary);
  }

  return NextResponse.json({
    ran: connections.length,
    synced,
    failed,
    alerts,
    closed,
    at: new Date().toISOString(),
  });
}
