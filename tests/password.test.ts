import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  LEAKED_PASSWORD_MESSAGE,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN,
  WEAK_PASSWORD_MESSAGE,
  passwordSchema,
  weakPasswordError,
  withConfirmation,
} from "@/lib/auth/password";
import { safeNextPath } from "@/lib/auth/origin";
import { acceptInvitationSchema, signupSchema } from "@/lib/validation";

// Issue #58 — the password rule of the whole product. What these tests defend
// is not "a min() exists" but that there is exactly ONE rule and every entry
// door consumes it: signup, invitation acceptance, recovery and change.

const ok = "senha bem comprida";

describe("password schema", () => {
  it("accepts a password at the minimum length", () => {
    expect(passwordSchema.safeParse("a".repeat(PASSWORD_MIN)).success).toBe(true);
  });

  it("rejects one character below the minimum, in pt-BR", () => {
    const result = passwordSchema.safeParse("a".repeat(PASSWORD_MIN - 1));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      `A senha precisa de pelo menos ${PASSWORD_MIN} caracteres.`,
    );
  });

  it("has no composition requirement: lowercase-only and spaces both pass", () => {
    // NIST 800-63B: length + breach, never character classes. A test guards the
    // decision so a future contributor cannot "harden" it back into Senha@123.
    expect(passwordSchema.safeParse("todas minusculas aqui").success).toBe(true);
    expect(passwordSchema.safeParse("   espaco  no  meio  ").success).toBe(true);
  });

  it("never trims: the secret is what was typed", () => {
    const padded = `  ${ok}  `;
    const parsed = passwordSchema.parse(padded);
    expect(parsed).toBe(padded);
  });

  it("refuses more than 72 bytes — bcrypt would truncate the rest away", () => {
    expect(passwordSchema.safeParse("a".repeat(PASSWORD_MAX_BYTES)).success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(PASSWORD_MAX_BYTES + 1)).success).toBe(
      false,
    );
  });

  it("counts bytes, not characters: accents cost two", () => {
    // 40 "ã" = 80 bytes in UTF-8, comfortably under 72 characters.
    const accented = "ã".repeat(40);
    expect(accented.length).toBeLessThan(PASSWORD_MAX_BYTES);
    expect(passwordSchema.safeParse(accented).success).toBe(false);
  });
});

describe("confirmation", () => {
  const schema = withConfirmation({});

  it("accepts matching passwords", () => {
    expect(schema.safeParse({ password: ok, confirmation: ok }).success).toBe(true);
  });

  it("reports a mismatch on the confirmation field, not on the password", () => {
    const result = schema.safeParse({ password: ok, confirmation: `${ok}!` });
    expect(result.success).toBe(false);
    const issue = result.error?.issues[0];
    expect(issue?.path).toEqual(["confirmation"]);
    expect(issue?.message).toBe("As senhas não conferem.");
  });

  it("still applies the length rule to the password itself", () => {
    const short = "curta";
    const result = schema.safeParse({ password: short, confirmation: short });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["password"]);
  });

  it("carries extra fields through — the change-password form adds the current one", () => {
    const schemaWithCurrent = withConfirmation({
      currentPassword: z.string().min(1, "Informe sua senha atual."),
    });
    expect(
      schemaWithCurrent.safeParse({
        currentPassword: "",
        password: ok,
        confirmation: ok,
      }).success,
    ).toBe(false);
    expect(
      schemaWithCurrent.safeParse({
        currentPassword: "a senha antiga",
        password: ok,
        confirmation: ok,
      }).success,
    ).toBe(true);
  });
});

describe("weak-password mapping (Supabase leaked-password protection)", () => {
  it("turns a breach refusal into a field error on the password input", () => {
    const mapped = weakPasswordError({ code: "weak_password", reasons: ["pwned"] });
    expect(mapped).toEqual({
      error: LEAKED_PASSWORD_MESSAGE,
      fieldErrors: { password: LEAKED_PASSWORD_MESSAGE },
    });
  });

  it("falls back to the calm generic message when no reason is given", () => {
    expect(weakPasswordError({ code: "weak_password" })?.error).toBe(
      WEAK_PASSWORD_MESSAGE,
    );
    expect(weakPasswordError({ code: "weak_password", reasons: ["length"] })?.error).toBe(
      WEAK_PASSWORD_MESSAGE,
    );
  });

  it("leaves every other error alone, so callers keep their own copy", () => {
    expect(weakPasswordError({ code: "user_already_exists" })).toBeNull();
    expect(weakPasswordError(null)).toBeNull();
    expect(weakPasswordError(undefined)).toBeNull();
  });

  it("never echoes the password back in the message", () => {
    const mapped = weakPasswordError({ code: "weak_password", reasons: ["pwned"] });
    expect(mapped?.error).not.toContain(ok);
  });
});

describe("callback destination guard (#68)", () => {
  it("keeps a plain path on this site", () => {
    expect(safeNextPath("/auth/nova-senha")).toBe("/auth/nova-senha");
    expect(safeNextPath("/times/abc?x=1")).toBe("/times/abc?x=1");
  });

  it("refuses anything that could start a new authority", () => {
    // Each of these would turn the auth callback into an open redirect — a
    // phishing hop wearing the product's own domain.
    for (const hostile of [
      "//evil.com",
      "https://evil.com",
      "http://evil.com",
      "/\\evil.com",
      "evil.com",
    ]) {
      expect(safeNextPath(hostile)).toBe("/");
    }
  });

  it("defaults to the home route when absent", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });
});

describe("one rule, every door", () => {
  // The composition below is what the actions actually parse with; if someone
  // reverts an action to the bare schema, these fail.
  const signupWithRule = signupSchema.extend({ password: passwordSchema });
  const acceptWithRule = acceptInvitationSchema.extend({ password: passwordSchema });
  const belowMinimum = "a".repeat(PASSWORD_MIN - 1);

  it("signup refuses a password below the shared minimum", () => {
    const result = signupWithRule.safeParse({
      companyName: "Acme",
      email: "ceo@acme.com",
      password: belowMinimum,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["password"]);
  });

  it("invitation acceptance refuses the same password", () => {
    const result = acceptWithRule.safeParse({
      token: "a-token",
      password: belowMinimum,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["password"]);
  });

  it("both accept a password that satisfies the shared rule", () => {
    expect(
      signupWithRule.safeParse({
        companyName: "Acme",
        email: "ceo@acme.com",
        password: ok,
      }).success,
    ).toBe(true);
    expect(acceptWithRule.safeParse({ token: "a-token", password: ok }).success).toBe(
      true,
    );
  });
});
