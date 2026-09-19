import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Notifications are a cross-tenant server path, but Supabase remains the
// product's source of truth for the data shown by the authenticated app. Keep
// this adapter local to the notification flow so a separate privileged
// database cannot make the cron silently see an empty product.

export type NotificationConnection = {
  tenant_id: string;
  provider: string;
};

export type NotificationBudgetRow = {
  scope: "org" | "team";
  team_id: string | null;
  amount: number;
  thresholds: number[] | null;
  frozen_fx_rate: number | null;
  fx_rate_source: string | null;
  fx_rate_date: string | null;
};

export type NotificationSubscriptionRow = {
  tool: string;
  seat_count: number;
  unit_price: number;
  team_id: string | null;
};

export type NotificationUsageRow = {
  provider: string;
  project_id: string;
  derived_cost: number | null;
  uncosted: boolean;
};

export type NotificationCostRow = {
  date: string;
  provider: string;
  amount: number;
};

function assertNoError(error: { code?: string; message?: string } | null): void {
  if (error) throw error;
}

export async function listActiveProviderConnections(): Promise<NotificationConnection[]> {
  const { data, error } = await createAdminClient()
    .from("provider_connection")
    .select("tenant_id, provider")
    .eq("status", "active");
  assertNoError(error);
  return (data ?? []) as NotificationConnection[];
}

export async function listBudgetTenantIds(periodMonth: string): Promise<string[]> {
  const { data, error } = await createAdminClient()
    .from("budget")
    .select("tenant_id")
    .eq("period_month", periodMonth);
  assertNoError(error);
  return [...new Set(((data ?? []) as { tenant_id: string }[]).map((row) => row.tenant_id))];
}

export async function listDigestTenantIds(periodMonth: string): Promise<string[]> {
  const { data, error } = await createAdminClient()
    .from("budget")
    .select("tenant_id")
    .eq("scope", "org")
    .eq("period_month", periodMonth);
  assertNoError(error);
  return ((data ?? []) as { tenant_id: string }[]).map((row) => row.tenant_id);
}

export async function findNotificationDisplayCurrency(
  tenantId: string,
): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("tenant")
    .select("display_currency")
    .eq("id", tenantId)
    .maybeSingle();
  assertNoError(error);
  return (data as { display_currency: string } | null)?.display_currency ?? null;
}

export async function findNotificationBudgets(
  tenantId: string,
  periodMonth: string,
): Promise<NotificationBudgetRow[]> {
  const { data, error } = await createAdminClient()
    .from("budget")
    .select(
      "scope, team_id, amount, thresholds, frozen_fx_rate, fx_rate_source, fx_rate_date",
    )
    .eq("tenant_id", tenantId)
    .eq("period_month", periodMonth);
  assertNoError(error);
  return ((data ?? []) as NotificationBudgetRow[]).map((row) => ({
    ...row,
    amount: Number(row.amount),
    thresholds: row.thresholds?.map(Number) ?? null,
    frozen_fx_rate: row.frozen_fx_rate === null ? null : Number(row.frozen_fx_rate),
  }));
}

export async function findNotificationSubscriptions(
  tenantId: string,
): Promise<NotificationSubscriptionRow[]> {
  const { data, error } = await createAdminClient()
    .from("subscription")
    .select("tool, seat_count, unit_price, team_id")
    .eq("tenant_id", tenantId);
  assertNoError(error);
  return ((data ?? []) as NotificationSubscriptionRow[]).map((row) => ({
    ...row,
    seat_count: Number(row.seat_count),
    unit_price: Number(row.unit_price),
  }));
}

export async function findNotificationTeams(
  tenantId: string,
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await createAdminClient()
    .from("team")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_unattributed", false);
  assertNoError(error);
  return (data ?? []) as { id: string; name: string }[];
}

export async function findNotificationUsage(
  tenantId: string,
  fromDate: string,
): Promise<NotificationUsageRow[]> {
  const { data, error } = await createAdminClient()
    .from("usage_daily")
    .select("provider, project_id, derived_cost, uncosted")
    .eq("tenant_id", tenantId)
    .gte("date", fromDate);
  assertNoError(error);
  return ((data ?? []) as NotificationUsageRow[]).map((row) => ({
    ...row,
    derived_cost: row.derived_cost === null ? null : Number(row.derived_cost),
  }));
}

export async function findNotificationProjectMap(
  tenantId: string,
): Promise<{ provider: string; project_id: string; team_id: string }[]> {
  const { data, error } = await createAdminClient()
    .from("project_map")
    .select("provider, project_id, team_id")
    .eq("tenant_id", tenantId);
  assertNoError(error);
  return (data ?? []) as { provider: string; project_id: string; team_id: string }[];
}

export async function findNotificationRecentCosts(
  tenantId: string,
  fromDate: string,
): Promise<NotificationCostRow[]> {
  const { data, error } = await createAdminClient()
    .from("cost_daily")
    .select("date, provider, amount")
    .eq("tenant_id", tenantId)
    .gte("date", fromDate);
  assertNoError(error);
  return ((data ?? []) as NotificationCostRow[]).map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));
}

export async function findNotifiableUsers(
  tenantId: string,
): Promise<{ email: string; role: string; digest_opt_out: boolean }[]> {
  const { data, error } = await createAdminClient()
    .from("app_user")
    .select("email, role, digest_opt_out")
    .eq("tenant_id", tenantId);
  assertNoError(error);
  return (data ?? []) as { email: string; role: string; digest_opt_out: boolean }[];
}

export async function findNotificationLogLevels(
  tenantId: string,
  periodMonth: string,
): Promise<{ target_id: string; level: string }[]> {
  const { data, error } = await createAdminClient()
    .from("notification_log")
    .select("target_id, level")
    .eq("tenant_id", tenantId)
    .eq("channel", "email")
    .eq("period_month", periodMonth);
  assertNoError(error);
  return (data ?? []) as { target_id: string; level: string }[];
}

export type NotificationLogInsert = {
  tenant_id: string;
  channel: string;
  target_id: string;
  level: string;
  period_month: string;
};

export async function insertNotificationLogIfAbsent(
  rows: NotificationLogInsert[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await createAdminClient()
    .from("notification_log")
    .upsert(rows, {
      onConflict: "tenant_id,channel,target_id,level,period_month",
      ignoreDuplicates: true,
    });
  assertNoError(error);
}
