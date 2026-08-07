import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminClient,
  hasDbEnv,
  requireDatabaseSuite,
  supabaseAnonKey,
  supabaseServiceKey,
  supabaseUrl,
} from "./support/db";

/**
 * Issue #23 acceptance — "removing a user revokes access immediately."
 * Runs against a real database; skips quietly without one locally and fails
 * the build in CI (`DENARIUS_REQUIRE_DB_TESTS=1`), so it never passes vacuously.
 */

const url = supabaseUrl;
const anonKey = supabaseAnonKey;
const serviceKey = supabaseServiceKey;

async function privacyMigrationApplied(): Promise<boolean> {
  if (!hasDbEnv) return false;
  // show_names arrives with the #23 migration; its absence errors the select.
  const { error } = await adminClient().from("tenant").select("show_names").limit(1);
  return !error;
}

const ready = requireDatabaseSuite(
  "rbac-privacy",
  await privacyMigrationApplied(),
  "no database env, or supabase/migrations/*_privacy.sql is not applied",
);

describe.skipIf(!ready)("remove user revokes access (issue #23)", () => {
  const admin: SupabaseClient = createClient(url ?? "http://skip", serviceKey ?? "skip", {
    auth: { persistSession: false },
  });
  const run = Date.now();
  let tenantId: string;
  let viewerId: string;
  const viewerEmail = `rbac-viewer-${run}@denarius-test.dev`;
  const viewerPassword = `Rbac-test-${run}!`;

  beforeAll(async () => {
    const { data: tenant, error: tenantError } = await admin
      .from("tenant")
      .insert({ name: `RBAC Test ${run}` })
      .select("id")
      .single();
    if (tenantError) throw tenantError;
    tenantId = tenant.id;

    const { data: authUser, error: authError } =
      await admin.auth.admin.createUser({
        email: viewerEmail,
        password: viewerPassword,
        email_confirm: true,
      });
    if (authError) throw authError;
    viewerId = authUser.user.id;

    const { error: appUserError } = await admin.from("app_user").insert({
      id: viewerId,
      tenant_id: tenantId,
      email: viewerEmail,
      role: "viewer",
    });
    if (appUserError) throw appUserError;
  });

  afterAll(async () => {
    await admin.from("tenant").delete().eq("id", tenantId);
    // The auth user may already be gone (that's the whole point) — ignore.
    await admin.auth.admin.deleteUser(viewerId).catch(() => {});
  });

  it("a seeded viewer can sign in and read their tenant BEFORE removal", async () => {
    const client = createClient(url!, anonKey!, {
      auth: { persistSession: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email: viewerEmail,
      password: viewerPassword,
    });
    expect(signInError).toBeNull();

    const { data } = await client.from("tenant").select("id");
    expect(data?.map((r) => r.id)).toEqual([tenantId]);
  });

  it("after removal, the app_user row is gone (auth-user delete cascades)", async () => {
    const { error } = await admin.auth.admin.deleteUser(viewerId);
    expect(error).toBeNull();

    const { data } = await admin
      .from("app_user")
      .select("id")
      .eq("id", viewerId);
    expect(data).toEqual([]);
  });

  it("the removed user can no longer sign in — access revoked immediately", async () => {
    const client = createClient(url!, anonKey!, {
      auth: { persistSession: false },
    });
    const { error } = await client.auth.signInWithPassword({
      email: viewerEmail,
      password: viewerPassword,
    });
    expect(error).not.toBeNull();
  });
});
