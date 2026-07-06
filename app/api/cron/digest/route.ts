import "server-only";

import { NextResponse } from "next/server";

import { monthStartUtc } from "@/lib/engine/period";
import { anthropicNarrator } from "@/lib/narrate/client";
import { emailChannel } from "@/lib/notify/channel";
import { sendWeeklyDigest } from "@/lib/notify/digest";
import { createAdminClient } from "@/lib/supabase/admin";

// Weekly executive digest (issue #20) — Vercel Cron, Fridays (vercel.json).
// Cross-tenant like the sync cron and guarded the same way: bearer
// CRON_SECRET, fail-closed when unset. One digest per tenant with an org
// budget this period, to Admins minus opt-outs. Numbers are deterministic;
// the LLM only rephrases (and its output is verified before sending).

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("budget")
    .select("tenant_id")
    .eq("scope", "org")
    .eq("period_month", monthStartUtc());
  if (error) {
    return NextResponse.json({ error: "could not list budgets" }, { status: 500 });
  }

  const tenants = [
    ...new Set(((data ?? []) as { tenant_id: string }[]).map((b) => b.tenant_id)),
  ];
  const channel = emailChannel();
  const narrator = anthropicNarrator();

  const counts = { tenants: tenants.length, sent: 0, narrated: 0, skipped: 0, failed: 0 };
  for (const tenantId of tenants) {
    const result = await sendWeeklyDigest(tenantId, channel, narrator);
    if (result.outcome === "sent") {
      counts.sent += 1;
      if (result.narrated) counts.narrated += 1;
    } else if (result.outcome === "failed") {
      counts.failed += 1;
    } else {
      counts.skipped += 1;
    }
  }

  return NextResponse.json({ ...counts, at: new Date().toISOString() });
}
