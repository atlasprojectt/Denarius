import { describe, expect, it } from "vitest";

import { REDACTED, describeError, redactLogDetail } from "@/lib/logging/redact";
import { referenceId } from "@/lib/logging/reference";
import { buildLine } from "@/lib/logging/server-log";

describe("logging safety contract (issue #79)", () => {
  it("turns a framework digest into the short user reference", () => {
    expect(referenceId("4F2A-91C0-longer")).toBe("4f2a91c0");
    expect(referenceId("---")).toBeNull();
    expect(referenceId(undefined)).toBeNull();
  });

  it("redacts secrets, people, prompts and responses at the logging seam", () => {
    const safe = redactLogDetail({
      password: "correct horse battery staple",
      providerKey: "sk-proj-secretsecretsecret",
      invitationToken: "opaque-token",
      userId: "person-123",
      email: "person@example.com",
      prompt: "summarize the board memo",
      response: "the model answer",
      reason: "Incorrect API key: sk-ant-admin-secretsecret and person@example.com",
      diagnostic:
        "material 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      tenantId: "4f0b6c42-dae1-465a-ac1a-406c23ec879f",
      count: 3,
    });

    expect(safe).toEqual({
      password: REDACTED,
      providerKey: REDACTED,
      invitationToken: REDACTED,
      userId: REDACTED,
      email: REDACTED,
      prompt: REDACTED,
      response: REDACTED,
      reason: `Incorrect API key: ${REDACTED} and ${REDACTED}`,
      diagnostic: `material ${REDACTED}`,
      tenantId: "4f0b6c42-dae1-465a-ac1a-406c23ec879f",
      count: 3,
    });
  });

  it("describes thrown errors without a stack and redacts embedded values", () => {
    const error = new Error("request for person@example.com used sk-proj-secretsecretsecret");
    error.stack = "stack with private implementation detail";

    expect(describeError(error)).toEqual({
      kind: "Error",
      reason: `request for ${REDACTED} used ${REDACTED}`,
    });
  });

  it("keeps structural fields authoritative and emits the searchable reference", () => {
    const line = buildLine(
      {
        op: "budget.update",
        outcome: "failed",
        tenantId: "4f0b6c42-dae1-465a-ac1a-406c23ec879f",
        digest: "4F2A-91C0-longer",
        detail: {
          op: "attempted override",
          outcome: "ok",
          tenant: "attempted override",
          code: "42501",
        },
      },
      new Date("2026-08-07T12:00:00.000Z"),
    );

    expect(line).toMatchObject({
      evt: "denarius",
      ts: "2026-08-07T12:00:00.000Z",
      level: "error",
      op: "budget.update",
      outcome: "failed",
      tenant: "4f0b6c42-dae1-465a-ac1a-406c23ec879f",
      ref: "4f2a91c0",
      code: "42501",
    });

    const anonymous = buildLine({
      op: "auth.signup",
      outcome: "failed",
      detail: { tenant: "invented", ref: "invented" },
    });
    expect(anonymous).not.toHaveProperty("tenant");
    expect(anonymous).not.toHaveProperty("ref");
  });
});
