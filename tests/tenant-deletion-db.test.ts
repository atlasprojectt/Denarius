import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { deleteTenantPermanently } from "@/lib/privacy/delete";
import {
  adminClient,
  hasDbEnv,
  requireDatabaseSuite,
  tableApplied,
} from "./support/db";

const tenantTables = [
  "app_user",
  "team",
  "employee",
  "subscription",
  "provider_connection",
  "usage_daily",
  "cost_daily",
  "project_map",
  "budget",
  "notification_log",
  "invitation",
  "audit_log",
  "period_snapshot",
] as const;

const applied = hasDbEnv
  ? (
      await Promise.all([
        tableApplied("tenant"),
        ...tenantTables.map((table) => tableApplied(table)),
      ])
    ).every(Boolean)
  : false;
const ready = requireDatabaseSuite(
  "tenant deletion (issue #74)",
  hasDbEnv && applied,
  "database unavailable or a tenant-owned table migration is not applied",
);

const admin = adminClient();
let cleanupTenantId: string | null = null;
let cleanupUserId: string | null = null;

afterEach(async () => {
  if (cleanupUserId) {
    await admin.auth.admin.deleteUser(cleanupUserId).catch(() => {});
  }
  if (cleanupTenantId) {
    await admin.from("tenant").delete().eq("id", cleanupTenantId);
  }
  cleanupTenantId = null;
  cleanupUserId = null;
});

describe.skipIf(!ready)("tenant deletion database invariant", () => {
  it("leaves no tenant row, system log or Auth user behind", async () => {
    const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const email = `delete-${stamp}@denarius-test.dev`;
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password: `Strong-${randomUUID()}!`,
        email_confirm: true,
      });
    expect(authError).toBeNull();
    const userId = authData.user?.id;
    expect(userId).toBeTruthy();
    if (!userId) return;
    cleanupUserId = userId;

    const { data: tenantData, error: tenantError } = await admin
      .from("tenant")
      .insert({ name: `Delete ${stamp}` })
      .select("id, name")
      .single();
    expect(tenantError).toBeNull();
    const tenant = tenantData as { id: string; name: string };
    cleanupTenantId = tenant.id;

    const { data: teamData, error: teamError } = await admin
      .from("team")
      .insert({ tenant_id: tenant.id, name: `Team ${stamp}` })
      .select("id")
      .single();
    expect(teamError).toBeNull();
    const teamId = (teamData as { id: string }).id;

    const appUserInsert = await admin.from("app_user").insert({
      id: userId,
      tenant_id: tenant.id,
      email,
      role: "admin",
    });
    expect(appUserInsert.error).toBeNull();

    const period = "2026-07-01";
    const inserts = await Promise.all([
      admin.from("employee").insert({
        tenant_id: tenant.id,
        team_id: teamId,
        name: "Pessoa",
        email: `person-${stamp}@denarius-test.dev`,
      }),
      admin.from("subscription").insert({
        tenant_id: tenant.id,
        team_id: teamId,
        tool: "Test tool",
        seat_count: 1,
        unit_price: 10,
      }),
      admin.from("provider_connection").insert({
        tenant_id: tenant.id,
        provider: "openai",
        status: "active",
        encrypted_credential: "test-ciphertext",
      }),
      admin.from("usage_daily").insert({
        tenant_id: tenant.id,
        date: "2026-07-02",
        provider: "openai",
        project_id: `project-${stamp}`,
        model: "gpt-5",
        input_tokens: 1,
        output_tokens: 1,
        derived_cost: 0.01,
      }),
      admin.from("cost_daily").insert({
        tenant_id: tenant.id,
        date: "2026-07-02",
        provider: "openai",
        project_id: `project-${stamp}`,
        line_item: "usage",
        amount: 0.01,
      }),
      admin.from("project_map").insert({
        tenant_id: tenant.id,
        provider: "openai",
        project_id: `project-${stamp}`,
        team_id: teamId,
      }),
      admin.from("budget").insert({
        tenant_id: tenant.id,
        scope: "org",
        period_month: period,
        amount: 100,
      }),
      admin.from("notification_log").insert({
        tenant_id: tenant.id,
        target_id: "org",
        level: "warning",
        period_month: period,
      }),
      admin.from("invitation").insert({
        tenant_id: tenant.id,
        email: `invite-${stamp}@denarius-test.dev`,
        role: "viewer",
        token_hash: randomUUID().replaceAll("-", "") + randomUUID(),
        invited_by: userId,
        expires_at: "2026-08-30T00:00:00Z",
      }),
      admin.from("audit_log").insert({
        tenant_id: tenant.id,
        actor_id: userId,
        actor_email: email,
        action: "test.seeded",
      }),
      admin.from("period_snapshot").insert({
        tenant_id: tenant.id,
        period_month: period,
        currency: "BRL",
        breakdown: {},
      }),
    ]);
    for (const insert of inserts) expect(insert.error).toBeNull();

    const result = await deleteTenantPermanently({
      actor: { userId, tenantId: tenant.id, email },
      companyName: tenant.name,
    });
    expect(result).toEqual({ ok: true });

    cleanupTenantId = null;
    cleanupUserId = null;

    const survivorCounts = await Promise.all([
      admin
        .from("tenant")
        .select("id", { count: "exact", head: true })
        .eq("id", tenant.id),
      ...tenantTables.map((table) =>
        admin
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
      ),
    ]);
    for (const query of survivorCounts) {
      expect(query.error).toBeNull();
      expect(query.count).toBe(0);
    }

    const { data: deletedAuth } = await admin.auth.admin.getUserById(userId);
    expect(deletedAuth.user).toBeNull();
  });
});
