import { describe, expect, it } from "vitest";

import {
  budgetSchema,
  employeeUpdateSchema,
  fieldErrorsOf,
  subscriptionSchema,
} from "@/lib/validation";

// WP6 of the 2026-07-11 audit plan (S2/QA-06): shared zod schemas expose typed
// field-level errors and accept the localized pt-BR monetary format
// authoritatively on the server — the client mask is a convenience, never a
// requirement.

describe("fieldErrorsOf — typed inline errors", () => {
  it("keys the first message per field", () => {
    const parsed = subscriptionSchema.safeParse({
      tool: "x", // too short
      seatCount: "0", // below 1
      unitPrice: "-5", // negative
      teamId: null,
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const fields = fieldErrorsOf(parsed.error);
    expect(fields.tool).toContain("Informe a ferramenta");
    expect(fields.seatCount).toContain("Pelo menos 1 assento");
    expect(fields.unitPrice).toContain("não pode ser negativo");
  });
});

describe("localized monetary input — exact numeric meaning preserved", () => {
  const base = { tool: "ChatGPT Team", seatCount: "10", teamId: null };

  it("accepts the pt-BR format with thousands dot and decimal comma", () => {
    const parsed = subscriptionSchema.safeParse({
      ...base,
      unitPrice: "1.234,56",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.unitPrice).toBe(1234.56);
  });

  it("accepts the plain machine format unchanged", () => {
    const parsed = subscriptionSchema.safeParse({ ...base, unitPrice: "57.9" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.unitPrice).toBe(57.9);
  });

  it("accepts a decimal comma without thousands ('57,90')", () => {
    const parsed = subscriptionSchema.safeParse({ ...base, unitPrice: "57,90" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.unitPrice).toBe(57.9);
  });

  it("rejects garbage with a field-level message instead of coercing", () => {
    const parsed = subscriptionSchema.safeParse({ ...base, unitPrice: "abc" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(fieldErrorsOf(parsed.error).unitPrice).toBeTruthy();
  });

  it("budget amounts take the same localized path", () => {
    const parsed = budgetSchema.safeParse({
      scope: "org",
      teamId: null,
      amount: "10.000,00",
      warnPct: "80",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.amount).toBe(10000);
  });
});

describe("employee update — the safe email-edit contract (UX-14)", () => {
  const base = {
    employeeId: "5f0c9c1e-7b57-4a52-9d3a-0e51de3a3b6f",
    name: "Ana Souza",
    teamId: "0b7a1f0c-2f7e-4f0a-a9c9-98e5f8f0a111",
  };

  it("normalizes the email to lowercase (the import identity key)", () => {
    const parsed = employeeUpdateSchema.safeParse({
      ...base,
      email: "Ana.SOUZA@Empresa.com.br",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("ana.souza@empresa.com.br");
  });

  it("rejects an invalid email with a field-level message", () => {
    const parsed = employeeUpdateSchema.safeParse({ ...base, email: "not-an-email" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(fieldErrorsOf(parsed.error).email).toContain("e-mail válido");
  });
});
