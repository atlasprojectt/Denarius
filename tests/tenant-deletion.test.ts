import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  companyName: "Empresa Exata",
  events: [] as string[],
  users: ["viewer-1", "admin-actor", "admin-2"],
  revokeError: false,
  membershipError: false,
  authErrorFor: null as string | null,
  tenantDeleteError: false,
}));

function resetState(): void {
  state.companyName = "Empresa Exata";
  state.events = [];
  state.users = ["viewer-1", "admin-actor", "admin-2"];
  state.revokeError = false;
  state.membershipError = false;
  state.authErrorFor = null;
  state.tenantDeleteError = false;
}

function queryFor(table: string) {
  let operation: "select" | "update" | "delete" = "select";
  const query = {
    select() {
      operation = "select";
      return query;
    },
    update() {
      operation = "update";
      state.events.push("credentials-revoked");
      return query;
    },
    delete() {
      operation = "delete";
      return query;
    },
    eq() {
      return query;
    },
    maybeSingle() {
      if (table === "tenant") {
        return Promise.resolve({
          data: { name: state.companyName },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
    then(onFulfilled: (value: unknown) => unknown) {
      if (table === "provider_connection" && operation === "update") {
        return Promise.resolve({
          data: null,
          error: state.revokeError ? { code: "500" } : null,
        }).then(onFulfilled);
      }
      if (table === "app_user" && operation === "select") {
        return Promise.resolve({
          data: state.users.map((id) => ({ id })),
          error: state.membershipError ? { code: "500" } : null,
        }).then(onFulfilled);
      }
      if (table === "tenant" && operation === "delete") {
        state.events.push("tenant-deleted");
        return Promise.resolve({
          data: null,
          error: state.tenantDeleteError ? { code: "500" } : null,
          count: state.tenantDeleteError ? 0 : 1,
        }).then(onFulfilled);
      }
      return Promise.resolve({ data: null, error: null }).then(onFulfilled);
    },
  };
  return query;
}

vi.mock("@/lib/audit/log", () => ({
  recordAudit: async () => {
    state.events.push("audit-written");
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => queryFor(table),
    auth: {
      admin: {
        deleteUser: async (userId: string) => {
          state.events.push(`auth-deleted:${userId}`);
          return {
            error:
              state.authErrorFor === userId ? { message: "failed" } : null,
          };
        },
      },
    },
  }),
}));

import { deleteTenantPermanently } from "@/lib/privacy/delete";

const actor = {
  userId: "admin-actor",
  tenantId: "tenant-A",
  email: "admin@empresa.test",
};

beforeEach(resetState);

describe("tenant deletion", () => {
  it("revokes credentials, audits, deletes every Auth user with the actor last, then cascades", async () => {
    const result = await deleteTenantPermanently({
      actor,
      companyName: state.companyName,
    });

    expect(result).toEqual({ ok: true });
    expect(state.events).toEqual([
      "credentials-revoked",
      "audit-written",
      "auth-deleted:viewer-1",
      "auth-deleted:admin-2",
      "auth-deleted:admin-actor",
      "tenant-deleted",
    ]);
  });

  it("requires the exact current company name before any mutation", async () => {
    const result = await deleteTenantPermanently({
      actor,
      companyName: "empresa exata",
    });

    expect(result).toEqual({ ok: false, reason: "name_mismatch" });
    expect(state.events).toEqual([]);
  });

  it("stops before audit or Auth deletion when credentials cannot be discarded", async () => {
    state.revokeError = true;

    const result = await deleteTenantPermanently({
      actor,
      companyName: state.companyName,
    });

    expect(result).toEqual({
      ok: false,
      reason: "credential_revoke_failed",
    });
    expect(state.events).toEqual(["credentials-revoked"]);
  });

  it("never deletes the tenant after an Auth deletion fails", async () => {
    state.authErrorFor = "admin-2";

    const result = await deleteTenantPermanently({
      actor,
      companyName: state.companyName,
    });

    expect(result).toEqual({ ok: false, reason: "auth_delete_failed" });
    expect(state.events).not.toContain("tenant-deleted");
    expect(state.events).not.toContain("auth-deleted:admin-actor");
  });

  it("refuses the cascade when the acting Admin is missing from membership", async () => {
    state.users = ["viewer-1"];

    const result = await deleteTenantPermanently({
      actor,
      companyName: state.companyName,
    });

    expect(result).toEqual({ ok: false, reason: "membership_read_failed" });
    expect(state.events).toEqual(["credentials-revoked"]);
  });
});

describe("deletion authorization", () => {
  it("denies a Viewer before invoking the destructive core", async () => {
    vi.resetModules();
    const deleteCore = vi.fn();
    vi.doMock("@/lib/auth/session", () => ({
      requireAdmin: async () => ({ error: "admin only" }),
    }));
    vi.doMock("@/lib/privacy/delete", () => ({
      deleteTenantPermanently: deleteCore,
    }));
    vi.doMock("next/navigation", () => ({ redirect: vi.fn() }));

    const { deleteTenantAccount } = await import("@/lib/privacy/actions");
    const formData = new FormData();
    formData.set("companyName", state.companyName);
    const result = await deleteTenantAccount({}, formData);

    expect(result.error).toBeTruthy();
    expect(deleteCore).not.toHaveBeenCalled();
  });
});
