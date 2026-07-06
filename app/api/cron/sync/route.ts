import "server-only";

import { NextResponse } from "next/server";

import { monthStartUtc } from "@/lib/engine/period";
import { sendBudgetAlerts } from "@/lib/notify/alerts";
import { emailChannel } from "@/lib/notify/channel";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_connection")
    .select("tenant_id, provider")
    .eq("status", "active");
  if (error) {
    return NextResponse.json({ error: "could not list connections" }, { status: 500 });
  }

  const connections = (data ?? []) as ConnectionRow[];
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
  const { data: budgetData } = await admin
    .from("budget")
    .select("tenant_id")
    .eq("period_month", monthStartUtc());
  const budgetTenants = [
    ...new Set(((budgetData ?? []) as { tenant_id: string }[]).map((b) => b.tenant_id)),
  ];

  const channel = emailChannel();
  const alerts = { tenants: budgetTenants.length, sent: 0, failed: 0, undeliverable: 0 };
  for (const tenantId of budgetTenants) {
    const result = await sendBudgetAlerts(tenantId, channel);
    alerts.sent += result.sent;
    alerts.failed += result.failed;
    alerts.undeliverable += result.undeliverable;
  }

  return NextResponse.json({
    ran: connections.length,
    synced,
    failed,
    alerts,
    at: new Date().toISOString(),
  });
}
