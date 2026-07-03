import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Integration tests for the atomic roster_import RPC (issue #13), against the
 * real Supabase project. Self-skips loudly until the roster migration is
 * applied — never passes vacuously.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasEnv = Boolean(url && anonKey && serviceKey);

async function rosterMigrationApplied(): Promise<boolean> {
  if (!hasEnv) return false;
  const admin = createClient(url!, serviceKey!, {
    auth: { persistSession: false },
  });
  const { error } = await admin.from("employee").select("id").limit(1);
  return !error;
}

const ready = await rosterMigrationApplied();
if (!ready) {
  console.warn(
    "\n[roster-import] SKIPPED — missing env or roster migration not applied. " +
      "Apply supabase/migrations/*_roster.sql and re-run: npm test\n",
  );
}

type Seeded = { tenantId: string; userId: string; email: string; password: string };

describe.skipIf(!ready)("roster_import RPC", () => {
  const admin: SupabaseClient = createClient(
    url ?? "http://skip",
    serviceKey ?? "skip",
    { auth: { persistSession: false } },
  );
  const run = Date.now();
  let adminA: Seeded;
  let viewerA: Seeded;
  let adminB: Seeded;

  async function seedUser(
    label: string,
    role: "admin" | "viewer",
    tenantId?: string,
  ): Promise<Seeded> {
    let tid = tenantId;
    if (!tid) {
      const { data: tenant, error } = await admin
        .from("tenant")
        .insert({ name: `Roster Test ${label} ${run}` })
        .select("id")
        .single();
      if (error) throw error;
      tid = tenant.id;
    }
    const email = `roster-${label}-${run}@denarius-test.dev`;
    const password = `Roster-${run}-${label}!`;
    const { data: authUser, error: authError } =
      await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (authError) throw authError;
    const { error: appUserError } = await admin
      .from("app_user")
      .insert({ id: authUser.user.id, tenant_id: tid, email, role });
    if (appUserError) throw appUserError;
    return { tenantId: tid!, userId: authUser.user.id, email, password };
  }

  async function signedIn(seed: Seeded): Promise<SupabaseClient> {
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
    adminA = await seedUser("admin-a", "admin");
    viewerA = await seedUser("viewer-a", "viewer", adminA.tenantId);
    adminB = await seedUser("admin-b", "admin");
  });

  afterAll(async () => {
    for (const seed of [adminA, adminB]) {
      if (seed) await admin.from("tenant").delete().eq("id", seed.tenantId);
    }
    for (const seed of [adminA, viewerA, adminB]) {
      if (seed) await admin.auth.admin.deleteUser(seed.userId);
    }
  });

  it("imports rows, creating teams and employees for the caller's tenant", async () => {
    const client = await signedIn(adminA);
    const { data, error } = await client.rpc("roster_import", {
      rows: [
        { name: "Ana Souza", email: `ana-${run}@acme.dev`, team: "Engineering" },
        { name: "Bruno Lima", email: `bruno-${run}@acme.dev`, team: "Marketing" },
      ],
    });
    expect(error).toBeNull();
    expect(data).toEqual({ imported: 2, teams_created: 2 });

    const { data: employees } = await client
      .from("employee")
      .select("name, email, team:team_id(name)")
      .order("name");
    expect(employees).toHaveLength(2);
  });

  it("re-import updates by email without duplicating (name/team changes land)", async () => {
    const client = await signedIn(adminA);
    const { data, error } = await client.rpc("roster_import", {
      rows: [
        // Same email, new name and new team.
        { name: "Ana S. Prado", email: `ana-${run}@acme.dev`, team: "Data" },
      ],
    });
    expect(error).toBeNull();
    expect(data).toEqual({ imported: 1, teams_created: 1 });

    const { data: employees } = await client
      .from("employee")
      .select("name, email, team:team_id(name)")
      .order("name");
    expect(employees).toHaveLength(2); // still 2 — no duplicate
    const ana = (employees as unknown as {
      name: string;
      email: string;
      team: { name: string } | null;
    }[]).find((e) => e.email === `ana-${run}@acme.dev`);
    expect(ana?.name).toBe("Ana S. Prado");
    expect(ana?.team?.name).toBe("Data");
  });

  it("rejects viewers (admin role enforced inside the function)", async () => {
    const client = await signedIn(viewerA);
    const { error } = await client.rpc("roster_import", {
      rows: [{ name: "Mallory X", email: `mal-${run}@acme.dev`, team: "Ops" }],
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain("admin role required");
  });

  it("is tenant-isolated: B never sees A's employees, and B's import lands in B only", async () => {
    const clientB = await signedIn(adminB);

    const { data: before } = await clientB.from("employee").select("id");
    expect(before).toEqual([]);

    await clientB.rpc("roster_import", {
      rows: [{ name: "Beto Braga", email: `beto-${run}@beta.dev`, team: "Ops" }],
    });

    const { data: after } = await clientB.from("employee").select("email");
    expect(after).toEqual([{ email: `beto-${run}@beta.dev` }]);

    const clientA = await signedIn(adminA);
    const { data: aSees } = await clientA
      .from("employee")
      .select("email")
      .eq("email", `beto-${run}@beta.dev`);
    expect(aSees).toEqual([]);
  });

  it("direct writes to employee remain denied by RLS (imports go through the RPC)", async () => {
    const client = await signedIn(adminA);
    const { data: team } = await client.from("team").select("id").limit(1).single();
    const { error } = await client.from("employee").insert({
      tenant_id: adminA.tenantId,
      team_id: team!.id,
      name: "Direct Write",
      email: `direct-${run}@acme.dev`,
    });
    expect(error).not.toBeNull();
  });
});
