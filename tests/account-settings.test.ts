import { describe, expect, it } from "vitest";

import {
  canEditCompanySettings,
  canEditProfileName,
  profileInitials,
  profileLabel,
} from "@/lib/settings/account";
import { companySettingsSchema, profileNameSchema } from "@/lib/validation";

describe("account settings validation", () => {
  it("accepts a valid profile name and trims it", () => {
    const parsed = profileNameSchema.parse({ displayName: "  Ana Silva  " });
    expect(parsed.displayName).toBe("Ana Silva");
  });

  it("rejects an invalid profile name with pt-BR copy", () => {
    const parsed = profileNameSchema.safeParse({ displayName: "A" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe(
        "Informe seu nome (mínimo 2 caracteres).",
      );
    }
  });

  it("accepts a valid company name and trims it", () => {
    const parsed = companySettingsSchema.parse({
      companyName: "  Denarius Labs  ",
    });
    expect(parsed.companyName).toBe("Denarius Labs");
  });

  it("rejects an invalid company name with pt-BR copy", () => {
    const parsed = companySettingsSchema.safeParse({ companyName: "D" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe(
        "Informe o nome da empresa (mínimo 2 caracteres).",
      );
    }
  });
});

describe("account settings permissions", () => {
  it("only lets a user edit their own profile name", () => {
    expect(
      canEditProfileName({ sessionUserId: "u1", targetUserId: "u1" }),
    ).toBe(true);
    expect(
      canEditProfileName({ sessionUserId: "u1", targetUserId: "u2" }),
    ).toBe(false);
  });

  it("only admins edit company settings", () => {
    expect(canEditCompanySettings("admin")).toBe(true);
    expect(canEditCompanySettings("viewer")).toBe(false);
  });
});

describe("profile display helpers", () => {
  it("uses display name before email", () => {
    expect(profileLabel({ displayName: "Ana Silva", email: "ana@acme.com" })).toBe(
      "Ana Silva",
    );
    expect(profileLabel({ displayName: null, email: "ana@acme.com" })).toBe(
      "ana@acme.com",
    );
  });

  it("builds initials from display name or email", () => {
    expect(
      profileInitials({ displayName: "Ana Maria Silva", email: "ana@acme.com" }),
    ).toBe("AS");
    expect(profileInitials({ displayName: null, email: "billing@acme.com" })).toBe(
      "B",
    );
  });
});
