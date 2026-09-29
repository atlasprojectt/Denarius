import { afterEach, describe, expect, it } from "vitest";

import {
  ACCOUNT_DELETION_MAX_ATTEMPTS,
  challengeCanVerify,
  challengeIsOpen,
  deletionPhrase,
  generateDeletionCode,
  generateDeletionGrant,
  hashDeletionValue,
  sameDeletionHash,
} from "@/lib/privacy/deletion-challenge";
import { renderAccountDeletionCode } from "@/lib/privacy/deletion-email";

const originalKey = process.env.ACCOUNT_DELETION_HMAC_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.ACCOUNT_DELETION_HMAC_KEY;
  else process.env.ACCOUNT_DELETION_HMAC_KEY = originalKey;
});

function challenge(overrides: Partial<Parameters<typeof challengeIsOpen>[0]> = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    tenant_id: "00000000-0000-4000-8000-000000000002",
    user_id: "00000000-0000-4000-8000-000000000003",
    role: "viewer" as const,
    target_name: "João",
    expected_phrase: "Eu excluo a minha conta, João.",
    code_hash: "hash",
    grant_hash: null,
    attempts: 0,
    expires_at: "2030-01-01T00:00:00.000Z",
    verified_at: null,
    consumed_at: null,
    created_at: "2029-12-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("account deletion challenge", () => {
  it("creates a six-digit code and an independent high-entropy grant", () => {
    const code = generateDeletionCode();
    const grant = generateDeletionGrant();
    expect(code).toMatch(/^\d{6}$/);
    expect(grant.length).toBeGreaterThan(30);
  });

  it("hashes code and grant values without storing either secret", () => {
    process.env.ACCOUNT_DELETION_HMAC_KEY = "test-hmac-key";
    const codeHash = hashDeletionValue("code", "challenge:123456");
    const same = hashDeletionValue("code", "challenge:123456");
    const otherKind = hashDeletionValue("grant", "challenge:123456");
    expect(sameDeletionHash(codeHash, same)).toBe(true);
    expect(sameDeletionHash(codeHash, otherKind)).toBe(false);
    expect(codeHash).not.toContain("123456");
  });

  it("requires an open, unverified challenge and blocks the fifth failed attempt", () => {
    const now = new Date("2026-09-28T12:00:00.000Z");
    expect(challengeIsOpen(challenge({ expires_at: "2026-09-28T12:05:00.000Z" }), now)).toBe(true);
    expect(challengeCanVerify(challenge({ expires_at: "2026-09-28T12:05:00.000Z" }), now)).toBe(true);
    expect(challengeCanVerify(challenge({ attempts: ACCOUNT_DELETION_MAX_ATTEMPTS }), now)).toBe(false);
    expect(challengeCanVerify(challenge({ verified_at: "2026-09-28T11:59:00.000Z" }), now)).toBe(false);
    expect(challengeCanVerify(challenge({ expires_at: "2026-09-28T11:59:00.000Z" }), now)).toBe(false);
  });

  it("keeps the final phrase role-specific", () => {
    expect(deletionPhrase("admin", "Acme")).toBe("Eu confirmo a exclusão da empresa Acme.");
    expect(deletionPhrase("viewer", "João")).toBe("Eu excluo a minha conta, João.");
  });
});

describe("account deletion email", () => {
  it("renders the code in plain text and escaped HTML", () => {
    const email = renderAccountDeletionCode({ to: "person@example.com", code: "123456" });
    expect(email.to).toEqual(["person@example.com"]);
    expect(email.text).toContain("123456");
    expect(email.html).toContain("123456");
    expect(email.html).toContain("10 minutos");
  });
});
