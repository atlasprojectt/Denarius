import { beforeEach, describe, expect, it, vi } from "vitest";

// Changing your own password from /preferencias. `updateUser` never checks who
// is asking, so without a proof beyond the session an unlocked laptop or a
// stolen cookie is a permanent account takeover. The proof is a six-digit code
// e-mailed to the account's address (founder direction 2026-10-05, replacing
// the current-password check of issue #69). These tests hold that proof, its
// expiry and binding, the fail-closed limiter and mail legs, the Google-only
// refusal, and the eviction of every other session — over in-memory stubs.

const state = vi.hoisted(() => ({
  user: null as Record<string, unknown> | null,
  cookies: new Map<string, string>(),
  sent: [] as { to: string[]; text: string; html: string }[],
  channelConfigured: true,
  sendFails: false,
  /** "allow" | "deny" | "throw" — the limiter RPC's answer. */
  limiter: "allow" as "allow" | "deny" | "throw",
  limiterBuckets: [] as string[],
  updateError: null as { code?: string; reasons?: string[] } | null,
  updatedPasswords: [] as string[],
  signOutScopes: [] as (string | undefined)[],
}));

const EMAIL = "ceo@empresa.com";
const NEXT = "senha nova bem longa";

function emailUser(id = "user-1"): Record<string, unknown> {
  return { id, email: EMAIL, identities: [{ provider: "email" }] };
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
  process.env.ACCOUNT_DELETION_HMAC_KEY = "test-hmac-key";
  state.user = emailUser();
  state.cookies = new Map();
  state.sent = [];
  state.channelConfigured = true;
  state.sendFails = false;
  state.limiter = "allow";
  state.limiterBuckets = [];
  state.updateError = null;
  state.updatedPasswords = [];
  state.signOutScopes = [];
}

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`UNEXPECTED_REDIRECT:${path}`);
  },
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: (name: string) =>
      state.cookies.has(name) ? { value: state.cookies.get(name) } : undefined,
    set: (name: string, value: string) => {
      state.cookies.set(name, value);
    },
    delete: (name: string) => {
      state.cookies.delete(name);
    },
  }),
}));

vi.mock("@/lib/auth/origin", () => ({
  requestOrigin: async () => "https://denarius.app",
  safeNextPath: (value: string | null) => value ?? "/",
}));

vi.mock("@/lib/auth/recovery", () => ({
  RECOVERY_PATH: "/auth/nova-senha",
  RECOVERY_RESPONSE_FLOOR_MS: 0,
  hasRecoveryGrant: async () => false,
  clearRecoveryGrant: async () => {},
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

vi.mock("@/lib/db/admin", () => ({
  rateLimitTake: async ({ p_bucket }: { p_bucket: string }) => {
    state.limiterBuckets.push(p_bucket);
    if (state.limiter === "throw") throw new Error("rpc unavailable");
    return state.limiter === "allow";
  },
}));

vi.mock("@/lib/notify/channel", () => ({
  emailChannel: () =>
    state.channelConfigured
      ? {
          send: async (message: { to: string[]; text: string; html: string }) => {
            if (state.sendFails) return { ok: false, error: "resend responded 500" };
            state.sent.push(message);
            return { ok: true };
          },
        }
      : null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user }, error: null }),
      updateUser: async ({ password }: { password: string }) => {
        if (state.updateError) return { data: {}, error: state.updateError };
        state.updatedPasswords.push(password);
        return { data: { user: state.user }, error: null };
      },
      signOut: async (options?: { scope?: string }) => {
        state.signOutScopes.push(options?.scope);
        return { error: null };
      },
    },
  }),
}));

const { changePassword, requestPasswordChangeCode } = await import(
  "@/lib/auth/actions"
);
const { PASSWORD_CHANGE_COOKIE, PASSWORD_CHANGE_TTL_SECONDS } = await import(
  "@/lib/auth/password-change"
);

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

/** Requests a code and reads it back out of the e-mail, the only place it goes. */
async function requestCode(): Promise<string> {
  const result = await requestPasswordChangeCode({}, form({}));
  expect(result.error).toBeUndefined();
  const code = /\b(\d{6})\b/.exec(state.sent.at(-1)?.text ?? "")?.[1];
  expect(code).toMatch(/^\d{6}$/);
  return code!;
}

function otherCode(code: string): string {
  return code === "000000" ? "000001" : "000000";
}

function change(code: string, password = NEXT, confirmation = password) {
  return changePassword({}, form({ code, password, confirmation }));
}

describe("requesting a password-change code", () => {
  beforeEach(reset);

  it("e-mails a six-digit code to the account's own address", async () => {
    const result = await requestPasswordChangeCode({}, form({}));

    expect(result.notice).toBeTruthy();
    expect(state.sent).toHaveLength(1);
    expect(state.sent[0].to).toEqual([EMAIL]);
    expect(state.sent[0].text).toMatch(/\b\d{6}\b/);
    expect(state.cookies.has(PASSWORD_CHANGE_COOKIE)).toBe(true);
  });

  it("keeps the code out of the cookie and out of the response", async () => {
    const result = await requestPasswordChangeCode({}, form({}));
    const code = /\b(\d{6})\b/.exec(state.sent[0].text)![1];

    expect(JSON.stringify(result)).not.toContain(code);
    expect(state.cookies.get(PASSWORD_CHANGE_COOKIE)).not.toContain(code);
  });

  it("refuses when the limiter says no, sending nothing", async () => {
    state.limiter = "deny";
    const result = await requestPasswordChangeCode({}, form({}));

    expect(result.error).toMatch(/Aguarde/);
    expect(state.sent).toEqual([]);
    expect(state.cookies.size).toBe(0);
  });

  it("fails closed when the limiter itself is unavailable", async () => {
    // An unthrottled sender would be a mailer aimed at our own customer.
    state.limiter = "throw";
    const result = await requestPasswordChangeCode({}, form({}));

    expect(result.error).toBeTruthy();
    expect(state.sent).toEqual([]);
  });

  it("fails closed without a mail channel, leaving no challenge behind", async () => {
    state.channelConfigured = false;
    const result = await requestPasswordChangeCode({}, form({}));

    expect(result.error).toBeTruthy();
    expect(state.cookies.size).toBe(0);
  });

  it("leaves no challenge behind when the e-mail fails to send", async () => {
    state.sendFails = true;
    const result = await requestPasswordChangeCode({}, form({}));

    expect(result.error).toBeTruthy();
    expect(state.cookies.size).toBe(0);
  });

  it("refuses a Google-only account with an explanation", async () => {
    state.user = googleUser();
    const result = await requestPasswordChangeCode({}, form({}));

    expect(result.error).toContain("Google");
    expect(state.sent).toEqual([]);
  });

  it("refuses when the session is gone", async () => {
    state.user = null;
    const result = await requestPasswordChangeCode({}, form({}));

    expect(result.error).toBeTruthy();
    expect(state.sent).toEqual([]);
  });
});

describe("changing the password with the code", () => {
  beforeEach(reset);

  it("changes it, evicts every other session and burns the challenge", async () => {
    const code = await requestCode();
    const result = await change(code);

    expect(result.notice).toBeTruthy();
    expect(result.error).toBeUndefined();
    expect(state.updatedPasswords).toEqual([NEXT]);
    expect(state.signOutScopes).toEqual(["others"]);
    expect(state.cookies.has(PASSWORD_CHANGE_COOKIE)).toBe(false);
  });

  it("refuses a wrong code, on that field, changing nothing", async () => {
    const code = await requestCode();
    const result = await change(otherCode(code));

    expect(result.fieldErrors?.code).toBeTruthy();
    expect(state.updatedPasswords).toEqual([]);
    expect(state.signOutScopes).toEqual([]);
    // The right code still works afterwards — a typo does not cost an e-mail.
    expect((await change(code)).notice).toBeTruthy();
  });

  it("refuses a code nobody requested", async () => {
    const result = await change("123456");

    expect(result.fieldErrors?.code).toBeTruthy();
    expect(state.updatedPasswords).toEqual([]);
  });

  it("refuses an expired code", async () => {
    vi.useFakeTimers();
    try {
      const code = await requestCode();
      vi.advanceTimersByTime(PASSWORD_CHANGE_TTL_SECONDS * 1000 + 1);
      const result = await change(code);

      expect(result.fieldErrors?.code).toBeTruthy();
      expect(state.updatedPasswords).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("binds the code to the account that requested it", async () => {
    const code = await requestCode();
    state.user = emailUser("user-3");
    const result = await change(code);

    expect(result.fieldErrors?.code).toBeTruthy();
    expect(state.updatedPasswords).toEqual([]);
  });

  it("refuses a tampered challenge", async () => {
    const code = await requestCode();
    const sealed = state.cookies.get(PASSWORD_CHANGE_COOKIE)!;
    const [expiresAt, mac] = sealed.split(".");
    // Pushing the expiry out without the server key must not keep it alive.
    state.cookies.set(
      PASSWORD_CHANGE_COOKIE,
      `${Number(expiresAt) + 3_600_000}.${mac}`,
    );

    expect((await change(code)).fieldErrors?.code).toBeTruthy();
    expect(state.updatedPasswords).toEqual([]);
  });

  it("stops accepting an older code once a new one is requested", async () => {
    const first = await requestCode();
    const second = await requestCode();
    if (first === second) return;

    expect((await change(first)).fieldErrors?.code).toBeTruthy();
    expect((await change(second)).notice).toBeTruthy();
  });

  it("checks the schema before spending a limiter slot or the code", async () => {
    const code = await requestCode();
    const slotsBefore = state.limiterBuckets.length;
    const result = await change(code, "curta");

    expect(result.fieldErrors?.password).toBeTruthy();
    expect(state.limiterBuckets).toHaveLength(slotsBefore);
    expect(state.updatedPasswords).toEqual([]);
  });

  it("reports a mismatched confirmation on the confirmation field", async () => {
    const code = await requestCode();
    const result = await change(code, NEXT, `${NEXT}!`);

    expect(result.fieldErrors?.confirmation).toBeTruthy();
    expect(state.updatedPasswords).toEqual([]);
  });

  it("asks for the six digits instead of accepting a blank or malformed code", async () => {
    await requestCode();
    for (const code of ["", "12345", "abcdef", "1234567"]) {
      const result = await change(code);
      expect(result.fieldErrors?.code).toBeTruthy();
    }
    expect(state.updatedPasswords).toEqual([]);
  });

  it("refuses when the limiter says no — or cannot answer", async () => {
    const code = await requestCode();
    for (const limiter of ["deny", "throw"] as const) {
      state.limiter = limiter;
      const result = await change(code);
      expect(result.error).toBeTruthy();
      expect(result.fieldErrors).toBeUndefined();
    }
    expect(state.updatedPasswords).toEqual([]);
  });

  it("keeps the challenge alive when the new password is refused", async () => {
    // A leaked password is the password's fault, not the code's: the person
    // picks another one without waiting for a new e-mail.
    const code = await requestCode();
    state.updateError = { code: "weak_password", reasons: ["pwned"] };
    const refused = await change(code);

    expect(refused.fieldErrors?.password).toContain("vazamentos");
    expect(state.signOutScopes).toEqual([]);
    expect(state.cookies.has(PASSWORD_CHANGE_COOKIE)).toBe(true);

    state.updateError = null;
    expect((await change(code, "outra senha bem longa")).notice).toBeTruthy();
  });

  it("says plainly when the new password is the old one", async () => {
    const code = await requestCode();
    state.updateError = { code: "same_password" };
    const result = await change(code);

    expect(result.fieldErrors?.password).toMatch(/diferente/i);
  });

  it("refuses a Google-only account with an explanation, not a code error", async () => {
    const code = await requestCode();
    state.user = googleUser();
    const result = await change(code);

    expect(result.error).toContain("Google");
    expect(result.fieldErrors).toBeUndefined();
    expect(state.updatedPasswords).toEqual([]);
  });

  it("refuses when the session is gone", async () => {
    const code = await requestCode();
    state.user = null;
    const result = await change(code);

    expect(result.error).toBeTruthy();
    expect(state.updatedPasswords).toEqual([]);
  });

  it("never echoes the password or the code back to the client", async () => {
    for (const scenario of [
      () => {},
      () => { state.updateError = { code: "unexpected_failure" }; },
      () => { state.limiter = "deny"; },
    ]) {
      reset();
      const code = await requestCode();
      scenario();
      const serialized = JSON.stringify(await change(code));
      expect(serialized).not.toContain(NEXT);
      expect(serialized).not.toContain(code);
    }
  });
});
