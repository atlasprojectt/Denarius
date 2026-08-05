import { beforeEach, describe, expect, it, vi } from "vitest";

// Issue #68 — forgot password. Two behaviours are not negotiable and both are
// asserted here over an in-memory Supabase stub: the request step must be an
// enumeration dead end (one answer for every address), and the reset step must
// refuse anything that did not come through a live recovery link.

const state = vi.hoisted(() => ({
  /** What resetPasswordForEmail should pretend happened. */
  resetError: null as { message: string } | null,
  /** Recorded so a test can prove the link points back at the reset page. */
  redirectTo: "" as string,
  user: { id: "user-1", email: "ceo@empresa.com" } as { id: string; email: string } | null,
  updateError: null as { code?: string; reasons?: string[] } | null,
  updatedPassword: null as string | null,
  signOutScopes: [] as (string | undefined)[],
  recoveryGrant: true,
  grantCleared: false,
  redirected: [] as string[],
}));

function reset(): void {
  state.resetError = null;
  state.redirectTo = "";
  state.user = { id: "user-1", email: "ceo@empresa.com" };
  state.updateError = null;
  state.updatedPassword = null;
  state.signOutScopes = [];
  state.recoveryGrant = true;
  state.grantCleared = false;
  state.redirected = [];
}

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    state.redirected.push(path);
    // Next's redirect throws to unwind the action; mirror that so nothing after
    // it in the action body runs.
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("@/lib/auth/origin", () => ({
  requestOrigin: async () => "https://denarius.app",
  safeNextPath: (value: string | null) => value ?? "/",
}));

vi.mock("@/lib/auth/recovery", () => ({
  RECOVERY_PATH: "/auth/nova-senha",
  hasRecoveryGrant: async () => state.recoveryGrant,
  clearRecoveryGrant: async () => {
    state.grantCleared = true;
  },
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      resetPasswordForEmail: async (
        _email: string,
        options: { redirectTo: string },
      ) => {
        state.redirectTo = options.redirectTo;
        return { data: {}, error: state.resetError };
      },
      getUser: async () => ({ data: { user: state.user }, error: null }),
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

const { RECOVERY_RESPONSE_FLOOR_MS, requestPasswordRecovery, resetPassword } =
  await import("@/lib/auth/actions");

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const NEW_PASSWORD = "uma senha bem longa";

describe("requesting a recovery link", () => {
  beforeEach(reset);

  it("answers a registered and an unknown address identically", async () => {
    const registered = await requestPasswordRecovery({}, form({ email: "ceo@empresa.com" }));

    state.resetError = { message: "User not found" };
    const unknown = await requestPasswordRecovery({}, form({ email: "ninguem@empresa.com" }));

    // Byte-for-byte the same state: no oracle in the message, in `error`, or in
    // any extra field a screen could render differently.
    expect(unknown).toEqual(registered);
    expect(registered.error).toBeUndefined();
    expect(registered.notice).toBeTruthy();
  });

  it("still answers the same way when the provider fails entirely", async () => {
    const ok = await requestPasswordRecovery({}, form({ email: "ceo@empresa.com" }));
    state.resetError = { message: "smtp is down" };
    const broken = await requestPasswordRecovery({}, form({ email: "ceo@empresa.com" }));
    expect(broken).toEqual(ok);
  });

  it("never names the address back in the notice", async () => {
    const result = await requestPasswordRecovery({}, form({ email: "ceo@empresa.com" }));
    expect(result.notice).not.toContain("ceo@empresa.com");
  });

  it("takes the same time whether or not the address exists", async () => {
    // Byte-identical copy in front of a timing gap is still an enumeration
    // oracle: Supabase does strictly more work for an address that exists (it
    // renders and sends an e-mail), and measuring the real provider showed
    // ~250ms against ~80ms. Both paths are held to the same floor.
    const startedUnknown = Date.now();
    state.resetError = { message: "User not found" };
    await requestPasswordRecovery({}, form({ email: "ninguem@empresa.com" }));
    const unknownMs = Date.now() - startedUnknown;

    const startedKnown = Date.now();
    state.resetError = null;
    await requestPasswordRecovery({}, form({ email: "ceo@empresa.com" }));
    const knownMs = Date.now() - startedKnown;

    // The stub answers instantly, so without the floor both would be ~0ms and
    // a regression would be invisible — assert the floor itself is enforced.
    const tolerance = 50;
    expect(unknownMs).toBeGreaterThanOrEqual(RECOVERY_RESPONSE_FLOOR_MS - tolerance);
    expect(knownMs).toBeGreaterThanOrEqual(RECOVERY_RESPONSE_FLOOR_MS - tolerance);
  });

  it("points the link at the callback, which hands off to the reset page", async () => {
    await requestPasswordRecovery({}, form({ email: "ceo@empresa.com" }));
    expect(state.redirectTo).toBe(
      "https://denarius.app/auth/callback?next=%2Fauth%2Fnova-senha",
    );
  });

  it("rejects a malformed address as a field error, before any send", async () => {
    const result = await requestPasswordRecovery({}, form({ email: "nao-e-email" }));
    expect(result.fieldErrors?.email).toBeTruthy();
    expect(state.redirectTo).toBe("");
  });
});

describe("setting the new password", () => {
  beforeEach(reset);

  async function submit(entries: Record<string, string>) {
    try {
      return await resetPassword({}, form(entries));
    } catch (error) {
      // The success path redirects, which throws by design.
      if ((error as Error).message === "NEXT_REDIRECT") return null;
      throw error;
    }
  }

  it("changes the password and revokes every other session", async () => {
    const result = await submit({
      password: NEW_PASSWORD,
      confirmation: NEW_PASSWORD,
    });

    expect(result).toBeNull();
    expect(state.updatedPassword).toBe(NEW_PASSWORD);
    expect(state.signOutScopes).toEqual(["others"]);
    expect(state.grantCleared).toBe(true);
    expect(state.redirected).toEqual(["/"]);
  });

  it("refuses without the recovery grant — a plain session is not a recovery", async () => {
    // This is the takeover a stolen cookie would otherwise buy: a new password
    // with no knowledge of the current one.
    state.recoveryGrant = false;

    const result = await submit({
      password: NEW_PASSWORD,
      confirmation: NEW_PASSWORD,
    });

    expect(result?.error).toBeTruthy();
    expect(state.updatedPassword).toBeNull();
    expect(state.signOutScopes).toEqual([]);
  });

  it("refuses when the recovery session is gone (expired or already used)", async () => {
    state.user = null;
    const result = await submit({
      password: NEW_PASSWORD,
      confirmation: NEW_PASSWORD,
    });
    expect(result?.error).toBeTruthy();
    expect(state.updatedPassword).toBeNull();
  });

  it("applies the shared password rule", async () => {
    const short = "curta";
    const result = await submit({ password: short, confirmation: short });
    expect(result?.fieldErrors?.password).toBeTruthy();
    expect(state.updatedPassword).toBeNull();
  });

  it("reports a mismatched confirmation on the confirmation field", async () => {
    const result = await submit({
      password: NEW_PASSWORD,
      confirmation: `${NEW_PASSWORD}!`,
    });
    expect(result?.fieldErrors?.confirmation).toBeTruthy();
    expect(state.updatedPassword).toBeNull();
  });

  it("surfaces a leaked password on the password field, not as a generic error", async () => {
    state.updateError = { code: "weak_password", reasons: ["pwned"] };
    const result = await submit({
      password: NEW_PASSWORD,
      confirmation: NEW_PASSWORD,
    });
    expect(result?.fieldErrors?.password).toContain("vazamentos");
  });

  it("keeps the grant when the change fails, so the person can try again", async () => {
    state.updateError = { code: "unexpected_failure" };
    await submit({ password: NEW_PASSWORD, confirmation: NEW_PASSWORD });
    expect(state.grantCleared).toBe(false);
  });

  it("never echoes the password back to the client", async () => {
    state.updateError = { code: "unexpected_failure" };
    const result = await submit({
      password: NEW_PASSWORD,
      confirmation: NEW_PASSWORD,
    });
    expect(JSON.stringify(result)).not.toContain(NEW_PASSWORD);
  });
});
