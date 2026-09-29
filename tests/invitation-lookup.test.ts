import { describe, expect, it, vi } from "vitest";

const { mockSupabaseAdmin, mockEq } = vi.hoisted(() => {
  const mockInvitation = {
    email: "convidada@empresa.com",
    expires_at: "2099-01-01T00:00:00.000Z",
    accepted_at: null,
    revoked_at: null,
    tenant: { name: "Acme" },
  };

  const mockEq = vi.fn(() => ({
    maybeSingle: vi.fn(async () => ({ data: mockInvitation, error: null })),
  }));

  return {
    mockSupabaseAdmin: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: mockEq,
        })),
      })),
    },
    mockEq,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockSupabaseAdmin,
}));

// Returning no row here models the separate Neon store that made every valid
// invite look dead after the privileged-path migration.
vi.mock("@/lib/db/admin", () => ({
  findInvitationByTokenHash: vi.fn(async () => null),
}));

describe("public invitation lookup", () => {
  it("finds a valid invitation in the same store used by invite actions", async () => {
    const { findInvitationByTokenHash } = await import(
      "@/lib/invitations/queries"
    );

    await expect(findInvitationByTokenHash("sha256-token-hash")).resolves.toEqual({
      email: "convidada@empresa.com",
      expires_at: "2099-01-01T00:00:00.000Z",
      accepted_at: null,
      revoked_at: null,
      tenant: { name: "Acme" },
    });
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("invitation");
    expect(mockEq).toHaveBeenCalledWith("token_hash", "sha256-token-hash");
  });
});
