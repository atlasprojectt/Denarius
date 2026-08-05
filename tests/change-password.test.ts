import { beforeEach, describe, expect, it, vi } from "vitest";

// Issue #69 — changing your own password from /configuracoes. The behaviour
// that matters is the one Supabase does NOT give us: `updateUser` never checks
// the current password, so without an explicit verification an unlocked laptop
// or a stolen session cookie is a permanent account takeover. These tests hold
// that verification, the Google-only refusal, and the eviction of every other
// session, over an in-memory Supabase stub.

const state = vi.hoisted(() => ({
  user: null as Record<string, unknown> | null,
  /** Passwords the throwaway probe client accepts. */
  correctPassword: "senha atual longa",
  /** Recorded so a test can prove the probe never became the real session. */
  probeSignIns: [] as { email: string; password: string }[],
  sessionSignIns: [] as { email: string; password: string }[],
  updateError: null as { code?: string; reasons?: string[] } | null,
  updatedPassword: null as string | null,
  signOutScopes: [] as (string | undefined)[],
}));

const EMAIL = "ceo@empresa.com";
const CURRENT = "senha atual longa";
const NEXT = "senha nova bem longa";

function emailUser(): Record<string, unknown> {
  return { id: "user-1", email: EMAIL, identities: [{ provider: "email" }] };
}

function googleUser(): Record<string, unknown> {
  return {
    id: "user-2",
    email: "ceo@gmail.com",
    identities: [{ provider: "google" }],
    app_metadata: { providers: ["google"] },
  };
}

function reset(): void {
  state.user = emailUser();
  state.correctPassword = CURRENT;
  state.probeSignIns = [];
  state.sessionSignIns = [];
  state.updateError = null;
  state.updatedPassword = null;
  state.signOutScopes = [];
}

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`UNEXPECTED_REDIRECT:${path}`);
  },
}));

vi.mock("@/lib/auth/origin", () => ({
  requestOrigin: async () => "https://denarius.app",
  safeNextPath: (value: string | null) => value ?? "/",
}));

vi.mock("@/lib/auth/recovery", () => ({
  RECOVERY_PATH: "/auth/nova-senha",
  hasRecoveryGrant: async () => false,
  clearRecoveryGrant: async () => {},
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

// The throwaway verification client. It must never write a session — if the
// action ever swapped it for the request-scoped one, `sessionSignIns` below
// would be the thing that fills up instead.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: async (creds: { email: string; password: string }) => {
        state.probeSignIns.push(creds);
        return creds.password === state.correctPassword
          ? { data: {}, error: null }
          : { data: {}, error: { code: "invalid_credentials" } };
      },
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user }, error: null }),
      signInWithPassword: async (creds: { email: string; password: string }) => {
        state.sessionSignIns.push(creds);
        return { data: {}, error: null };
      },
      updateUser: async ({ password }: { password: string }) => {
        if (state.updateError) return { data: {}, error: state.updateError };
        state.updatedPassword = password;
        return { data: { user: state.user }, error: null };
      },
      signOut: async (options?: { scope?: string }) => {
        state.signOutScopes.push(options?.scope);
        return { error: null };
      },
    },
  }),
}));

const { changePassword } = await import("@/lib/auth/actions");

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const good = {
  currentPassword: CURRENT,
  password: NEXT,
  confirmation: NEXT,
};

describe("changing your own password", () => {
  beforeEach(reset);

  it("changes it and evicts every other session", async () => {
    const result = await changePassword({}, form(good));

    expect(result.notice).toBeTruthy();
    expect(result.error).toBeUndefined();
    expect(state.updatedPassword).toBe(NEXT);
    expect(state.signOutScopes).toEqual(["others"]);
  });

  it("refuses a wrong current password, on that field, changing nothing", async () => {
    const result = await changePassword(
      {},
      form({ ...good, currentPassword: "nao e a minha senha" }),
    );

    expect(result.fieldErrors?.currentPassword).toBeTruthy();
    expect(state.updatedPassword).toBeNull();
    expect(state.signOutScopes).toEqual([]);
  });

  it("verifies on a throwaway client, never on the caller's session", async () => {
    // Verifying with the request-scoped client would rewrite the session
    // cookies as a side effect of a *check*. It must not be the one used.
    await changePassword({}, form(good));

    expect(state.probeSignIns).toEqual([{ email: EMAIL, password: CURRENT }]);
    expect(state.sessionSignIns).toEqual([]);
  });

  it("verifies BEFORE it changes anything", async () => {
    // Ordering is the whole defence: a change that happened and was then
    // rolled back would still have been a change.
    state.updateError = { code: "unexpected_failure" };
    await changePassword(
      {},
      form({ ...good, currentPassword: "errada demais" }),
    );
    expect(state.updatedPassword).toBeNull();
    expect(state.probeSignIns).toHaveLength(1);
  });

  it("applies the shared password rule to the new password", async () => {
    const result = await changePassword(
      {},
      form({ currentPassword: CURRENT, password: "curta", confirmation: "curta" }),
    );

    expect(result.fieldErrors?.password).toBeTruthy();
    expect(state.updatedPassword).toBeNull();
    // Rejected by the schema, so the current password was never even probed.
    expect(state.probeSignIns).toEqual([]);
  });

  it("reports a mismatched confirmation on the confirmation field", async () => {
    const result = await changePassword(
      {},
      form({ ...good, confirmation: `${NEXT}!` }),
    );

    expect(result.fieldErrors?.confirmation).toBeTruthy();
    expect(state.updatedPassword).toBeNull();
  });

  it("asks for the current password instead of silently accepting a blank one", async () => {
    const result = await changePassword(
      {},
      form({ ...good, currentPassword: "" }),
    );

    expect(result.fieldErrors?.currentPassword).toBeTruthy();
    expect(state.probeSignIns).toEqual([]);
  });

  it("refuses a Google-only account with an explanation, not a credential error", async () => {
    state.user = googleUser();
    const result = await changePassword({}, form(good));

    // The screen hides the form for these accounts; the action refuses again,
    // because a server action never trusts the UI that called it.
    expect(result.error).toContain("Google");
    expect(result.fieldErrors).toBeUndefined();
    expect(state.probeSignIns).toEqual([]);
    expect(state.updatedPassword).toBeNull();
  });

  it("refuses when the session is gone", async () => {
    state.user = null;
    const result = await changePassword({}, form(good));

    expect(result.error).toBeTruthy();
    expect(state.updatedPassword).toBeNull();
  });

  it("surfaces a leaked password on the password field", async () => {
    state.updateError = { code: "weak_password", reasons: ["pwned"] };
    const result = await changePassword({}, form(good));

    expect(result.fieldErrors?.password).toContain("vazamentos");
    expect(state.signOutScopes).toEqual([]);
  });

  it("says plainly when the new password is the old one", async () => {
    state.updateError = { code: "same_password" };
    const result = await changePassword({}, form(good));

    expect(result.fieldErrors?.password).toMatch(/diferente/i);
  });

  it("never echoes a password back to the client", async () => {
    for (const scenario of [
      () => {},
      () => { state.updateError = { code: "unexpected_failure" }; },
      () => { state.correctPassword = "outra coisa"; },
    ]) {
      reset();
      scenario();
      const result = await changePassword({}, form(good));
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(NEXT);
      expect(serialized).not.toContain(CURRENT);
    }
  });
});
