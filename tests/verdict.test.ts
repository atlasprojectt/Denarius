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
  teamId: name.toLowerCase(),
  name,
  evaluation: evaluateBudget({ budget, spent, period: period(day, 30) }),
});

const base = { currency: "BRL" };

describe("computeVerdict — the one-line answer", () => {
  it("collecting: before day 5, no projection to judge", () => {
    const v = computeVerdict({
      org: orgEval(300, 1000, 3),
      teams: [],
      ...base,
    });
    expect(v.status).toBe("collecting");
    expect(v.sentence).toContain("Coletando ritmo");
    expect(v.teamId).toBeNull();
  });

  it("green: projected to close under budget", () => {
    const v = computeVerdict({ org: orgEval(300), teams: [team("Eng", 100, 500)], ...base });
    expect(v.status).toBe("green");
    // org spent 300, day 15/30 → projection 600, projected margin 400.
    expect(v.sentence).toContain("No controle");
    expect(v.sentence).toContain("abaixo do orçamento");
    expect(v.sentence).toContain("R$");
    expect(v.teamId).toBeNull();
  });

  it("amber: org projected over, nothing breached yet — no close-date suffix", () => {
    const v = computeVerdict({ org: orgEval(600), teams: [team("Eng", 200, 500)], ...base });
    expect(v.status).toBe("amber");
    expect(v.sentence).toContain("Atenção");
    expect(v.sentence).toContain("acima do orçamento");
    // Shortened 2026-07-17: the period-close date left the sentence.
    expect(v.sentence).not.toContain("junho");
    expect(v.teamId).toBeNull();
  });

  it("red: a team has already breached — names it with ITS overrun and exposes its id", () => {
    const v = computeVerdict({
      org: orgEval(700),
      teams: [team("Eng", 520, 500), team("Data", 100, 500)],
      ...base,
    });
    expect(v.status).toBe("red");
    // Eng at 520/500 = 104% of its own budget → overrun 4%.
    expect(v.sentence).toBe("Eng ultrapassou o orçamento em 4%.");
    expect(v.teamId).toBe("eng");
  });

  it("red: names the WORST breached team when several breached", () => {
    const v = computeVerdict({
      org: orgEval(1200),
      teams: [team("Eng", 510, 500), team("Data", 700, 500)],
      ...base,
    });
    expect(v.status).toBe("red");
    expect(v.sentence).toContain("Data");
    expect(v.teamId).toBe("data");
  });

  it("red: org itself over budget with no breached team", () => {
    const v = computeVerdict({
      org: orgEval(1100),
      teams: [team("Eng", 100, 500)],
      ...base,
    });
    expect(v.status).toBe("red");
    // Org at 1100/1000 = 110% → overrun 10%; no team to point at.
    expect(v.sentence).toBe("A empresa ultrapassou o orçamento em 10%.");
    expect(v.teamId).toBeNull();
  });

  it("red: a sub-0.5% breach never rounds to \"0%\" — falls back to one decimal", () => {
    const v = computeVerdict({
      org: orgEval(700),
      teams: [team("Eng", 501, 500)],
      ...base,
    });
    expect(v.status).toBe("red");
    expect(v.sentence).toContain("0,2%");
    expect(v.sentence).not.toContain("em 0%");
  });
});
