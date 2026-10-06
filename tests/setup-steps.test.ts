import { describe, expect, it } from "vitest";

import {
  isStepDone,
  nextStep,
  previousStep,
  resolveSourceMode,
  resolveStep,
  type SetupProgress,
} from "@/lib/setup/steps";

const fresh: SetupProgress = {
  hasCompany: true,
  hasActiveConnection: false,
  hasSubscriptions: false,
  hasRoster: false,
  hasBudget: false,
};

const complete: SetupProgress = {
  hasCompany: true,
  hasActiveConnection: true,
  hasSubscriptions: false,
  hasRoster: true,
  hasBudget: true,
};

describe("guided setup steps", () => {
  it("forces the company step until a tenant exists, whatever was requested", () => {
    const noCompany = { ...fresh, hasCompany: false };
    expect(resolveStep(undefined, noCompany)).toBe("empresa");
    expect(resolveStep("orcamento", noCompany)).toBe("empresa");
  });

  it("opens on the first missing step by default", () => {
    expect(resolveStep(undefined, fresh)).toBe("fontes");
    expect(resolveStep(undefined, { ...fresh, hasSubscriptions: true })).toBe("times");
    expect(
      resolveStep(undefined, { ...fresh, hasActiveConnection: true, hasRoster: true }),
    ).toBe("orcamento");
  });

  it("lands on the last step when everything is already done", () => {
    expect(resolveStep(undefined, complete)).toBe("orcamento");
  });

  it("honors an explicit step so skip and back can move freely", () => {
    expect(resolveStep("orcamento", fresh)).toBe("orcamento");
    expect(resolveStep("times", complete)).toBe("times");
  });

  it("never reopens the company step once it exists and ignores unknown steps", () => {
    expect(resolveStep("empresa", fresh)).toBe("fontes");
    expect(resolveStep("qualquer", fresh)).toBe("fontes");
  });

  it("accepts either live APIs or hand-entered seats as a spend source", () => {
    expect(isStepDone("fontes", fresh)).toBe(false);
    expect(isStepDone("fontes", { ...fresh, hasActiveConnection: true })).toBe(true);
    expect(isStepDone("fontes", { ...fresh, hasSubscriptions: true })).toBe(true);
  });

  it("walks forward to the end and back without returning to the company step", () => {
    expect(nextStep("empresa")).toBe("fontes");
    expect(nextStep("orcamento")).toBeNull();
    expect(previousStep("times")).toBe("fontes");
    expect(previousStep("fontes")).toBeNull();
  });

  it("reopens the sources step on the mode the Admin already used", () => {
    expect(resolveSourceMode(undefined, fresh)).toBe("apis");
    expect(resolveSourceMode(undefined, { ...fresh, hasSubscriptions: true })).toBe("assinaturas");
    expect(
      resolveSourceMode(undefined, { ...fresh, hasSubscriptions: true, hasActiveConnection: true }),
    ).toBe("apis");
    expect(resolveSourceMode("assinaturas", fresh)).toBe("assinaturas");
    expect(resolveSourceMode("outro", fresh)).toBe("apis");
  });
});
