import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Issue #23 acceptance — "removing a user revokes access immediately."
 * Runs against the real Supabase project (env from .env.local); self-skips
 * with a warning when env is missing or the privacy migration hasn't been
 * applied, so it never passes vacuously.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasEnv = Boolean(url && anonKey && serviceKey);

async function privacyMigrationApplied(): Promise<boolean> {
  if (!hasEnv) return false;
  const admin = createClient(url!, serviceKey!, {
    auth: { persistSession: false },
  });
  // show_names arrives with the #23 migration; its absence errors the select.
  const { error } = await admin.from("tenant").select("show_names").limit(1);
  return !error;
}

const ready = await privacyMigrationApplied();
if (!ready) {
  console.warn(
    "\n[rbac-privacy] SKIPPED — missing env or privacy migration not applied. " +
      "Apply supabase/migrations/*_privacy.sql and re-run: npm test\n",
  );
}

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
