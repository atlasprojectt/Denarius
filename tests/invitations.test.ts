import { describe, expect, it } from "vitest";

import { renderInvite } from "@/lib/invitations/email";
import {
  INVITE_TTL_DAYS,
  expiryFrom,
  invitationState,
  isUsable,
} from "@/lib/invitations/policy";
import { generateToken, hashToken } from "@/lib/invitations/token";

const NOW = new Date("2026-07-15T12:00:00Z");

function inviteAt(expiresAt: string, overrides: Partial<{ acceptedAt: string | null; revokedAt: string | null }> = {}) {
  return {
    expiresAt,
    acceptedAt: overrides.acceptedAt ?? null,
    revokedAt: overrides.revokedAt ?? null,
  };
}

describe("invitation policy", () => {
  it("is pending while the clock has not run out", () => {
    const invite = inviteAt("2026-07-20T12:00:00Z");
    expect(invitationState(invite, NOW)).toBe("pending");
    expect(isUsable(invite, NOW)).toBe(true);
  });

  it("expires by the clock alone — no status column to go stale", () => {
    const invite = inviteAt("2026-07-15T11:59:59Z");
    expect(invitationState(invite, NOW)).toBe("expired");
    expect(isUsable(invite, NOW)).toBe(false);
  });

  it("treats the exact expiry instant as expired (the link is not usable at t=0)", () => {
    expect(invitationState(inviteAt(NOW.toISOString()), NOW)).toBe("expired");
  });

  it("burns on acceptance: a used token can never be used twice", () => {
    const invite = inviteAt("2026-07-20T12:00:00Z", {
      acceptedAt: "2026-07-16T09:00:00Z",
    });
    expect(invitationState(invite, NOW)).toBe("accepted");
    expect(isUsable(invite, NOW)).toBe(false);
  });

  it("revoking kills a still-valid link immediately", () => {
    const invite = inviteAt("2026-07-20T12:00:00Z", {
      revokedAt: "2026-07-15T11:00:00Z",
    });
    expect(invitationState(invite, NOW)).toBe("revoked");
    expect(isUsable(invite, NOW)).toBe(false);
  });

  it("reports what happened first: accepted outranks a later expiry", () => {
    const invite = inviteAt("2026-07-01T12:00:00Z", {
      acceptedAt: "2026-06-30T12:00:00Z",
    });
    expect(invitationState(invite, NOW)).toBe("accepted");
  });

  it("issues the TTL from the moment of issue", () => {
    const expiry = new Date(expiryFrom(NOW));
    const days = (expiry.getTime() - NOW.getTime()) / 86_400_000;
    expect(days).toBe(INVITE_TTL_DAYS);
    expect(isUsable(inviteAt(expiryFrom(NOW)), NOW)).toBe(true);
  });
});

describe("invitation token", () => {
  it("hashes deterministically, so a link can be looked up by its hash", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("never stores the token itself: the hash does not contain it", () => {
    const token = generateToken();
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("mints unguessable, unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
    // 32 bytes base64url — no padding, URL-safe (it travels in a path segment).
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe("invitation email", () => {
  const input = {
    to: "pessoa@empresa.com",
    companyName: "Acme",
    role: "viewer" as const,
    inviteUrl: "https://denarius.app/convite/tok123",
  };

  it("carries the link and the company in both bodies", () => {
    const mail = renderInvite(input);
    expect(mail.to).toEqual(["pessoa@empresa.com"]);
    expect(mail.subject).toContain("Acme");
    expect(mail.text).toContain(input.inviteUrl);
    expect(mail.html).toContain(input.inviteUrl);
  });

  it("states the role it grants — the invitee learns what they are getting", () => {
    expect(renderInvite(input).text).toContain("Visualizador");
    expect(renderInvite({ ...input, role: "admin" }).text).toContain("Administrador");
  });

  it("discloses the expiry", () => {
    expect(renderInvite(input).text).toContain(String(INVITE_TTL_DAYS));
  });

  it("escapes a company name so it cannot inject markup into the email", () => {
    const mail = renderInvite({ ...input, companyName: "<script>x</script>" });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });
});
