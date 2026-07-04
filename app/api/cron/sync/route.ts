import "server-only";

import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { runProviderSync, type ProviderName } from "@/lib/sync/provider-sync";

// Daily sync of every tenant's active connections — the one deliberate
// cross-tenant path (architecture §5.1). Vercel Cron hits this route on the
// schedule in vercel.json and sends `Authorization: Bearer $CRON_SECRET`; the
// route runs each tenant's per-provider sync (idempotent upserts, last-sync +
// error recorded on provider_connection). Never returns secrets or payloads.

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

  return NextResponse.json({
    ran: connections.length,
    synced,
    failed,
    at: new Date().toISOString(),
  });
}
