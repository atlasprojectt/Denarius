import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * THE most critical test in the repo (CLAUDE.md invariant #1):
 * tenant A must never read tenant B's rows, on any table.
 *
 * Runs against the real Supabase project (env from .env.local). Skips itself
 * with a loud warning when env vars are missing or the migration hasn't been
 * applied yet — it must never pass vacuously.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasEnv = Boolean(url && anonKey && serviceKey);

async function migrationApplied(): Promise<boolean> {
  if (!hasEnv) return false;
  const admin = createClient(url!, serviceKey!, {
    auth: { persistSession: false },
  });
  const { error } = await admin.from("tenant").select("id").limit(1);
  return !error;
}

const ready = await migrationApplied();
if (!ready) {
  console.warn(
    "\n[rls-isolation] SKIPPED — missing env or migration not applied yet. " +
      "Apply supabase/migrations/*_init_tenancy.sql and re-run: npm test\n",
  );
}

// Later migrations get their own readiness flag so this file covers each new
// table as soon as its migration lands, without failing before that.
async function tableApplied(table: string): Promise<boolean> {
  if (!hasEnv) return false;
  const admin = createClient(url!, serviceKey!, {
    auth: { persistSession: false },
  });
  const { error } = await admin.from(table).select("id").limit(1);
  return !error;
}

const subscriptionReady = ready && (await tableApplied("subscription"));
if (ready && !subscriptionReady) {
  console.warn(
    "\n[rls-isolation] subscription table not found — apply " +
      "supabase/migrations/*_subscriptions.sql to cover it here too.\n",
  );
}

const providersReady = ready && (await tableApplied("provider_connection"));
if (ready && !providersReady) {
  console.warn(
    "\n[rls-isolation] provider tables not found — apply " +
      "supabase/migrations/*_providers.sql to cover them here too.\n",
  );
}

const projectMapReady = ready && (await tableApplied("project_map"));
if (ready && !projectMapReady) {
  console.warn(
    "\n[rls-isolation] project_map table not found — apply " +
      "supabase/migrations/*_attribution.sql to cover it here too.\n",
  );
}

const budgetReady = ready && (await tableApplied("budget"));
if (ready && !budgetReady) {
  console.warn(
    "\n[rls-isolation] budget table not found — apply " +
      "supabase/migrations/*_budgets.sql to cover it here too.\n",
  );
}

const notificationLogReady = ready && (await tableApplied("notification_log"));
if (ready && !notificationLogReady) {
  console.warn(
    "\n[rls-isolation] notification_log table not found — apply " +
      "supabase/migrations/*_notifications.sql to cover it here too.\n",
  );
}

const invitationReady = ready && (await tableApplied("invitation"));
if (ready && !invitationReady) {
  console.warn(
    "\n[rls-isolation] invitation table not found — apply " +
      "supabase/migrations/*_invitations.sql to cover it here too.\n",
  );
}

const TABLES = [
  "tenant",
  "app_user",
  "team",
  ...(invitationReady ? (["invitation"] as const) : []),
  ...(subscriptionReady ? (["subscription"] as const) : []),
  ...(providersReady
    ? (["provider_connection", "usage_daily", "cost_daily"] as const)
    : []),
  ...(projectMapReady ? (["project_map"] as const) : []),
  ...(budgetReady ? (["budget"] as const) : []),
  ...(notificationLogReady ? (["notification_log"] as const) : []),
];

type Seeded = {
  tenantId: string;
  userId: string;
  email: string;
  password: string;
  teamId: string;
};

describe.skipIf(!ready)("RLS tenant isolation", () => {
  const admin: SupabaseClient = createClient(url ?? "http://skip", serviceKey ?? "skip", {
    auth: { persistSession: false },
  });
  const run = Date.now();
  let a: Seeded;
  let b: Seeded;

  async function seedTenant(label: string): Promise<Seeded> {
    const email = `rls-${label}-${run}@denarius-test.dev`;
    const password = `Rls-test-${run}-${label}!`;

    const { data: tenant, error: tenantError } = await admin
      .from("tenant")
      .insert({ name: `RLS Test ${label} ${run}` })
      .select("id")
      .single();
    if (tenantError) throw tenantError;

    const { data: authUser, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (authError) throw authError;

    const { error: appUserError } = await admin.from("app_user").insert({
      id: authUser.user.id,
      tenant_id: tenant.id,
      email,
      role: "admin",
    });
    if (appUserError) throw appUserError;

    const { data: team, error: teamError } = await admin
      .from("team")
      .insert({ tenant_id: tenant.id, name: `team-${label}` })
      .select("id")
      .single();
    if (teamError) throw teamError;

    if (subscriptionReady) {
      const { error: subError } = await admin.from("subscription").insert({
        tenant_id: tenant.id,
        tool: `tool-${label}`,
        seat_count: 5,
        unit_price: 30,
        team_id: team.id,
      });
      if (subError) throw subError;
    }

    if (providersReady) {
      const { error: connError } = await admin
        .from("provider_connection")
        .insert({
          tenant_id: tenant.id,
          provider: "openai",
          encrypted_credential: `v1.secret-${label}`,
          status: "active",
        });
      if (connError) throw connError;
      const { error: usageError } = await admin.from("usage_daily").insert({
        tenant_id: tenant.id,
        date: "2026-07-01",
        provider: "openai",
        project_id: `proj-${label}`,
        model: "gpt-4o",
        input_tokens: 1000,
        output_tokens: 100,
        derived_cost: 0.0035,
      });
      if (usageError) throw usageError;
      const { error: costError } = await admin.from("cost_daily").insert({
        tenant_id: tenant.id,
        date: "2026-07-01",
        provider: "openai",
        project_id: `proj-${label}`,
        line_item: "completions",
        amount: 1.23,
      });
      if (costError) throw costError;
    }

    if (projectMapReady) {
      const { error: mapError } = await admin.from("project_map").insert({
        tenant_id: tenant.id,
        provider: "openai",
        project_id: `proj-${label}`,
        team_id: team.id,
      });
      if (mapError) throw mapError;
    }

    if (budgetReady) {
      const { error: budgetError } = await admin.from("budget").insert({
        tenant_id: tenant.id,
        scope: "team",
        team_id: team.id,
        period_month: "2026-07-01",
        amount: 1000,
        currency: "BRL",
      });
      if (budgetError) throw budgetError;
    }

    if (invitationReady) {
      // A pending invite: the token hash must never be readable across tenants
      // (it is the credential for joining THIS tenant).
      const { error: inviteError } = await admin.from("invitation").insert({
        tenant_id: tenant.id,
        email: `invitee-${label}-${run}@denarius-test.dev`,
        role: "viewer",
        token_hash: `hash-${label}-${run}`,
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      });
      if (inviteError) throw inviteError;
    }

    if (notificationLogReady) {
      const { error: logInsertError } = await admin
        .from("notification_log")
        .insert({
          tenant_id: tenant.id,
          channel: "email",
          target_id: "org",
          level: "warning",
          period_month: "2026-07-01",
        });
      if (logInsertError) throw logInsertError;
    }

    return {
      tenantId: tenant.id,
      userId: authUser.user.id,
      email,
      password,
      teamId: team.id,
    };
  }

  async function signedInClient(seed: Seeded): Promise<SupabaseClient> {
    const client = createClient(url!, anonKey!, {
      auth: { persistSession: false },
    });
    const { error } = await client.auth.signInWithPassword({
      email: seed.email,
      password: seed.password,
    });
    if (error) throw error;
    return client;
  }

  beforeAll(async () => {
    a = await seedTenant("a");
    b = await seedTenant("b");
  });

  afterAll(async () => {
    // Deleting tenants cascades app_user and team; auth users go via admin API.
    for (const seed of [a, b]) {
      if (!seed) continue;
      await admin.from("tenant").delete().eq("id", seed.tenantId);
      await admin.auth.admin.deleteUser(seed.userId);
    }
  });

  it("user A sees exactly their own tenant, and never tenant B", async () => {
    const clientA = await signedInClient(a);
    const { data: visible } = await clientA.from("tenant").select("id");
    expect(visible?.map((r) => r.id)).toEqual([a.tenantId]);

    const { data: cross } = await clientA
      .from("tenant")
      .select("id")
      .eq("id", b.tenantId);
    expect(cross).toEqual([]);
  });

  it("user A never sees tenant B's teams or users, even by explicit id", async () => {
    const clientA = await signedInClient(a);

    const { data: teams } = await clientA.from("team").select("id, tenant_id");
    expect(teams?.every((t) => t.tenant_id === a.tenantId)).toBe(true);

    const { data: crossTeam } = await clientA
      .from("team")
      .select("id")
      .eq("id", b.teamId);
    expect(crossTeam).toEqual([]);

    const { data: crossUser } = await clientA
      .from("app_user")
      .select("id")
      .eq("id", b.userId);
    expect(crossUser).toEqual([]);
  });

  it("the same holds in the other direction (B cannot read A)", async () => {
    const clientB = await signedInClient(b);
    for (const table of TABLES) {
      const { data } = await clientB.from(table).select("*");
      const rows = (data ?? []) as { tenant_id?: string; id?: string }[];
      const leaked = rows.filter(
        (row) => (row.tenant_id ?? row.id) === a.tenantId,
      );
      expect(leaked).toEqual([]);
    }
  });

  it("anonymous (signed-out) clients read nothing from any table", async () => {
    const anonClient = createClient(url!, anonKey!, {
      auth: { persistSession: false },
    });
    for (const table of TABLES) {
      const { data } = await anonClient.from(table).select("*");
      expect(data ?? []).toEqual([]);
    }
  });

  it("RLS denies direct writes from a signed-in user (writes go through server actions)", async () => {
    const clientA = await signedInClient(a);
    const { error } = await clientA
      .from("team")
      .insert({ tenant_id: a.tenantId, name: "direct-write-should-fail" });
    expect(error).not.toBeNull();
  });

  it.skipIf(!providersReady)(
    "provider tables are tenant-isolated and the encrypted credential is unreadable (issue #15)",
    async () => {
      const clientA = await signedInClient(a);

      // Rows: A sees exactly its own connection/usage/cost, never B's.
      const { data: connections } = await clientA
        .from("provider_connection")
        .select("tenant_id, provider, status");
      expect(connections).toEqual([
        { tenant_id: a.tenantId, provider: "openai", status: "active" },
      ]);
      const { data: usage } = await clientA
        .from("usage_daily")
        .select("tenant_id, project_id");
      expect(usage).toEqual([
        { tenant_id: a.tenantId, project_id: "proj-a" },
      ]);
      const { data: costs } = await clientA
        .from("cost_daily")
        .select("tenant_id, project_id");
      expect(costs).toEqual([
        { tenant_id: a.tenantId, project_id: "proj-a" },
      ]);

      // Column-level grant: even the OWN tenant's admin cannot read the
      // encrypted credential from a browser session.
      const { error: columnDenied } = await clientA
        .from("provider_connection")
        .select("encrypted_credential");
      expect(columnDenied).not.toBeNull();

      // Writes stay deny-by-default (sync runs server-side only).
      const { error: writeDenied } = await clientA
        .from("provider_connection")
        .insert({ tenant_id: a.tenantId, provider: "anthropic" });
      expect(writeDenied).not.toBeNull();
      const { error: usageWriteDenied } = await clientA
        .from("usage_daily")
        .insert({
          tenant_id: a.tenantId,
          date: "2026-07-02",
          provider: "openai",
          model: "gpt-4o",
        });
      expect(usageWriteDenied).not.toBeNull();
    },
  );

  it.skipIf(!budgetReady)(
    "budget rows are tenant-isolated (issue #18) and direct writes denied",
    async () => {
      const clientA = await signedInClient(a);

      const { data } = await clientA.from("budget").select("tenant_id, amount");
      expect(data?.length).toBeGreaterThan(0);
      expect(data?.every((r) => r.tenant_id === a.tenantId)).toBe(true);

      const { error } = await clientA.from("budget").insert({
        tenant_id: a.tenantId,
        scope: "org",
        period_month: "2026-07-01",
        amount: 999,
      });
      expect(error).not.toBeNull();
    },
  );

  it.skipIf(!invitationReady)(
    "invitation rows are tenant-isolated, and a user cannot forge one",
    async () => {
      const clientA = await signedInClient(a);

      const { data } = await clientA.from("invitation").select("tenant_id, token_hash");
      expect(data?.length).toBeGreaterThan(0);
      expect(data?.every((r) => r.tenant_id === a.tenantId)).toBe(true);

      // B's pending invite — and above all its token hash — is invisible to A.
      const { data: crossTenant } = await clientA
        .from("invitation")
        .select("id")
        .eq("tenant_id", b.tenantId);
      expect(crossTenant ?? []).toEqual([]);

      // Self-inviting as admin (or into another tenant) is a write: denied.
      // Invites exist only through the admin-guarded server action.
      const { error: writeDenied } = await clientA.from("invitation").insert({
        tenant_id: a.tenantId,
        email: "forged@denarius-test.dev",
        role: "admin",
        token_hash: `forged-${run}`,
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      });
      expect(writeDenied).not.toBeNull();
    },
  );

  it.skipIf(!notificationLogReady)(
    "notification_log is system state: invisible even to the OWN tenant's admin (issue #20)",
    async () => {
      const clientA = await signedInClient(a);

      // No select policy at all — a browser session reads nothing, not even
      // its own tenant's rows (PRD P11: never user-facing).
      const { data } = await clientA.from("notification_log").select("*");
      expect(data ?? []).toEqual([]);

      const { error: writeDenied } = await clientA
        .from("notification_log")
        .insert({
          tenant_id: a.tenantId,
          channel: "email",
          target_id: "org",
          level: "breach",
          period_month: "2026-07-01",
        });
      expect(writeDenied).not.toBeNull();
    },
  );

  it.skipIf(!subscriptionReady)(
    "subscription rows are tenant-isolated (issue #14) and direct writes denied",
    async () => {
      const clientA = await signedInClient(a);

      const { data } = await clientA
        .from("subscription")
        .select("tenant_id, tool");
      expect(data?.length).toBeGreaterThan(0);
      expect(data?.every((r) => r.tenant_id === a.tenantId)).toBe(true);
      expect(data?.some((r) => r.tool === "tool-b")).toBe(false);

      const { error } = await clientA.from("subscription").insert({
        tenant_id: a.tenantId,
        tool: "direct-write-should-fail",
        seat_count: 1,
        unit_price: 1,
        team_id: a.teamId,
      });
      expect(error).not.toBeNull();
    },
  );
});

// ---------------------------------------------------------------------------
// Appended for issue #61 — rate_limit_hit. New table, new block, at the end.
// ---------------------------------------------------------------------------

const rateLimitReady = ready && (await tableApplied("rate_limit_hit"));
if (ready && !rateLimitReady) {
  console.warn(
    "\n[rls-isolation] rate_limit_hit table not found — apply " +
      "supabase/migrations/*_rate_limit.sql to cover it here too.\n",
  );
}

describe.skipIf(!rateLimitReady)("rate_limit_hit isolation (issue #61)", () => {
  // Self-contained on purpose: this file is append-only from #78 on, so the
  // block brings its own fixture instead of reaching into the scope above.
  // A session with no tenant at all is the right subject anyway — the claim is
  // "no policy serves anyone", not "the wrong tenant is filtered out".
  const serviceClient = createClient(url ?? "http://skip", serviceKey ?? "skip", {
    auth: { persistSession: false },
  });
  const stamp = Date.now();
  const email = `rate-limit-${stamp}@denarius-test.dev`;
  const password = `Rate-limit-${stamp}!`;
  let session: SupabaseClient;
  let userId: string;

  beforeAll(async () => {
    const { data, error } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;

    session = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const { error: signInError } = await session.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
  });

  afterAll(async () => {
    if (userId) await serviceClient.auth.admin.deleteUser(userId);
  });

  it("is system state: unreadable and unwritable from any session", async () => {
    // RLS on with NO policies, same posture as notification_log. A browser
    // session sees nothing — not another tenant's rows, not its own.
    const { data } = await session.from("rate_limit_hit").select("*");
    expect(data ?? []).toEqual([]);

    const { error: writeDenied } = await session
      .from("rate_limit_hit")
      .insert({ bucket: `forged-${stamp}` });
    expect(writeDenied).not.toBeNull();
  });

  it("does not expose the limiter function to a session either", async () => {
    // Reachable from the service role only: a session that could spend slots
    // could lock a tenant's own Admins out of inviting anyone.
    const { error } = await session.rpc("rate_limit_take", {
      p_bucket: `forged-${stamp}`,
      p_limit: 1,
      p_window_seconds: 60,
    });
    expect(error).not.toBeNull();
  });

  it("still limits when it is the service role asking", async () => {
    // The counterpart of the two refusals above: the path the server actions
    // actually use must work, or the feature is a silent no-op (the app fails
    // open when this call errors).
    const bucket = `test:isolation:${stamp}`;
    const first = await serviceClient.rpc("rate_limit_take", {
      p_bucket: bucket,
      p_limit: 1,
      p_window_seconds: 60,
    });
    const second = await serviceClient.rpc("rate_limit_take", {
      p_bucket: bucket,
      p_limit: 1,
      p_window_seconds: 60,
    });
    expect(first.error).toBeNull();
    expect(first.data).toBe(true);
    expect(second.data).toBe(false);
  });
});
