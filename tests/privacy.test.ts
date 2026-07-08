import { describe, expect, it } from "vitest";

import type { UsageBucket } from "@/lib/connectors/types";
import { collapsePersonGrain } from "@/lib/privacy/minimize";
import {
  anonymousLabel,
  canRemoveUser,
  canSeeNames,
} from "@/lib/privacy/policy";

describe("canSeeNames — the names-visibility matrix (PRD 54–56)", () => {
  it("an Admin sees names when the tenant switch is on (the default)", () => {
    expect(canSeeNames({ role: "admin", showNames: true })).toBe(true);
  });

  it("a Viewer NEVER sees names, even with the switch on (acceptance)", () => {
    expect(canSeeNames({ role: "viewer", showNames: true })).toBe(false);
  });

  it("the switch off hides names even for an Admin (acceptance)", () => {
    expect(canSeeNames({ role: "admin", showNames: false })).toBe(false);
  });

  it("an unknown role is treated as unprivileged", () => {
    expect(canSeeNames({ role: "", showNames: true })).toBe(false);
  });
});

describe("canRemoveUser", () => {
  it("an Admin may remove another user", () => {
    expect(
      canRemoveUser({ actorRole: "admin", actorId: "a", targetId: "b" }),
    ).toBe(true);
  });

  it("an Admin may NOT remove themselves (last-admin lockout guard)", () => {
    expect(
      canRemoveUser({ actorRole: "admin", actorId: "a", targetId: "a" }),
    ).toBe(false);
  });

  it("a Viewer may not remove anyone", () => {
    expect(
      canRemoveUser({ actorRole: "viewer", actorId: "a", targetId: "b" }),
    ).toBe(false);
  });
});

describe("anonymousLabel", () => {
  it("is 1-indexed and stable by position", () => {
    expect(anonymousLabel(0)).toBe("Colaborador 1");
    expect(anonymousLabel(2)).toBe("Colaborador 3");
  });
});

describe("collapsePersonGrain — data minimization (PRD 55)", () => {
  function bucket(overrides: Partial<UsageBucket>): UsageBucket {
    return {
      date: "2026-07-03",
      projectId: "proj-a",
      apiKeyId: "key-a",
      userId: "user-1",
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 10,
      ...overrides,
    };
  }

  it("sums tokens across users of a cell and blanks the user id", () => {
    const out = collapsePersonGrain([
      bucket({ userId: "user-1", inputTokens: 100, outputTokens: 10 }),
      bucket({ userId: "user-2", inputTokens: 40, outputTokens: 5 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].userId).toBe("");
    expect(out[0].inputTokens).toBe(140);
    expect(out[0].outputTokens).toBe(15);
  });

  it("keeps distinct cells separate (date / project / key / model)", () => {
    const out = collapsePersonGrain([
      bucket({ userId: "user-1", model: "gpt-4o" }),
      bucket({ userId: "user-2", model: "gpt-4o-mini" }),
      bucket({ userId: "user-3", projectId: "proj-b" }),
    ]);
    expect(out).toHaveLength(3);
    expect(out.every((b) => b.userId === "")).toBe(true);
  });

  it("preserves the grand total exactly (nothing dropped, only re-bucketed)", () => {
    const raw = [
      bucket({ userId: "u1", inputTokens: 100, outputTokens: 10 }),
      bucket({ userId: "u2", inputTokens: 200, outputTokens: 20 }),
      bucket({ userId: "u3", projectId: "proj-b", inputTokens: 30, outputTokens: 3 }),
    ];
    const sum = (bs: UsageBucket[]) =>
      bs.reduce((s, b) => s + b.inputTokens + b.outputTokens, 0);
    expect(sum(collapsePersonGrain(raw))).toBe(sum(raw));
  });

  it("is a no-op in shape for already-shared (user-free) buckets", () => {
    const out = collapsePersonGrain([bucket({ userId: "" })]);
    expect(out).toHaveLength(1);
    expect(out[0].userId).toBe("");
  });
});
