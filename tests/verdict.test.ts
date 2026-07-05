import { describe, expect, it } from "vitest";

import { evaluateBudget } from "@/lib/engine/budget";
import { computeVerdict, type VerdictTeam } from "@/lib/engine/verdict";

const period = (dayOfPeriod: number, daysInPeriod = 30) => ({
  dayOfPeriod,
  daysInPeriod,
});

const orgEval = (spent: number, budget = 1000, day = 15) =>
  evaluateBudget({ budget, spent, period: period(day, 30) });

const team = (name: string, spent: number, budget: number, day = 15): VerdictTeam => ({
  name,
  evaluation: evaluateBudget({ budget, spent, period: period(day, 30) }),
});

const base = { currency: "BRL", periodEndLabel: "30 de junho" };

describe("computeVerdict — the one-line answer", () => {
  it("collecting: before day 5, no projection to judge", () => {
    const v = computeVerdict({
      org: orgEval(300, 1000, 3),
      teams: [],
      ...base,
    });
    expect(v.status).toBe("collecting");
    expect(v.sentence).toContain("Coletando ritmo");
  });

  it("green: projected to close under budget", () => {
    const v = computeVerdict({ org: orgEval(300), teams: [team("Eng", 100, 500)], ...base });
    expect(v.status).toBe("green");
    // org spent 300, day 15/30 → projection 600, projected margin 400.
    expect(v.sentence).toContain("No controle");
    expect(v.sentence).toContain("R$");
  });

  it("amber: org projected over, nothing breached yet", () => {
    const v = computeVerdict({ org: orgEval(600), teams: [team("Eng", 200, 500)], ...base });
    expect(v.status).toBe("amber");
    expect(v.sentence).toContain("Atenção");
    expect(v.sentence).toContain("30 de junho");
  });

  it("red: a team has already breached — names it", () => {
    const v = computeVerdict({
      org: orgEval(700),
      teams: [team("Eng", 520, 500), team("Data", 100, 500)],
      ...base,
    });
    expect(v.status).toBe("red");
    expect(v.sentence).toContain("Eng");
    expect(v.sentence).toContain("Fora do orçamento");
  });

  it("red: org itself over budget with no breached team", () => {
    const v = computeVerdict({
      org: orgEval(1100),
      teams: [team("Eng", 100, 500)],
      ...base,
    });
    expect(v.status).toBe("red");
    expect(v.sentence).toContain("empresa");
  });
});
