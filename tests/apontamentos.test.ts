import { describe, expect, it } from "vitest";

import { combineTeamSpend } from "@/lib/engine/team-spend";
import {
  buildApontamentos,
  MAX_APONTAMENTOS,
  type ApontamentoInput,
} from "@/lib/findings/apontamentos";
import { money } from "@/lib/money";

function base(overrides: Partial<ApontamentoInput> = {}): ApontamentoInput {
  return {
    currency: "BRL",
    budgetedTeams: [],
    weekByTeam: [],
    spendMix: null,
    ...overrides,
  };
}

describe("halfway rule (crossed 50% of the limit)", () => {
  it("fires for teams at ≥50% without a warning, listed pt-BR style", () => {
    const out = buildApontamentos(
      base({
        budgetedTeams: [
          { name: "Data", pctSpent: 0.55, hasWarning: false },
          { name: "Ops", pctSpent: 0.62, hasWarning: false },
          { name: "Produto", pctSpent: 0.5, hasWarning: false },
          { name: "Vendas", pctSpent: 0.3, hasWarning: false },
        ],
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("halfway");
    expect(out[0].text).toBe("Data, Ops e Produto cruzaram 50% dos seus limites.");
  });

  it("uses singular phrasing for one team", () => {
    const out = buildApontamentos(
      base({ budgetedTeams: [{ name: "Data", pctSpent: 0.6, hasWarning: false }] }),
    );
    expect(out[0].text).toBe("Data cruzou 50% do limite do período.");
  });

  it("NEVER duplicates a warning: warned teams are excluded (acceptance)", () => {
    const out = buildApontamentos(
      base({
        budgetedTeams: [
          // 85% → already a warning on the needs-attention row; one event,
          // one channel — the footer stays silent about it.
          { name: "Marketing", pctSpent: 0.85, hasWarning: true },
          { name: "Vendas", pctSpent: 0.3, hasWarning: false },
        ],
      }),
    );
    expect(out).toEqual([]);
  });
});

describe("acceleration rule (week-over-week)", () => {
  it("fires at ≥40% with neutral observation language", () => {
    const out = buildApontamentos(
      base({
        weekByTeam: [
          { name: "Marketing", pct: 0.4 },
          { name: "Data", pct: 0.39 },
          { name: "Ops", pct: null }, // no prior week — no ratio, no guess
        ],
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("acceleration");
    expect(out[0].text).toBe("Marketing acelerou 40% em relação à semana anterior.");
  });

  it("orders multiple accelerations by size", () => {
    const out = buildApontamentos(
      base({
        weekByTeam: [
          { name: "Data", pct: 0.5 },
          { name: "Marketing", pct: 1.2 },
        ],
      }),
    );
    expect(out.map((a) => a.id)).toEqual([
      "acceleration:Marketing",
      "acceleration:Data",
    ]);
  });
});

describe("concentration rule", () => {
  const concentrated = {
    teamDrivers: [
      { label: "Eng", value: 5_000 },
      { label: "Data", value: 2_500 },
      { label: "Produto", value: 1_200 },
      { label: "Vendas", value: 800 },
      { label: "RH", value: 500 },
    ],
    unattributed: 0,
  };

  it("fires when the top 3 hold ≥70% among enough teams", () => {
    const out = buildApontamentos(base({ spendMix: concentrated }));
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("concentration");
    expect(out[0].text).toBe("3 times concentram 87% do gasto do período.");
  });

  it("stays silent when spend is diffuse", () => {
    const out = buildApontamentos(
      base({
        spendMix: {
          teamDrivers: [
            { label: "A", value: 1_000 },
            { label: "B", value: 1_000 },
            { label: "C", value: 1_000 },
            { label: "D", value: 1_000 },
            { label: "E", value: 1_000 },
          ],
          unattributed: 0,
        },
      }),
    );
    expect(out).toEqual([]);
  });

  it("stays silent with too few teams (trivially concentrated)", () => {
    const out = buildApontamentos(
      base({
        spendMix: {
          teamDrivers: [
            { label: "A", value: 5_000 },
            { label: "B", value: 100 },
          ],
          unattributed: 0,
        },
      }),
    );
    expect(out).toEqual([]);
  });
});

describe("unattributed nudge", () => {
  it("fires at ≥5% of org spend with the amount in the display currency", () => {
    const out = buildApontamentos(
      base({
        spendMix: {
          teamDrivers: [{ label: "Eng", value: 8_100 }],
          unattributed: 900,
        },
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("unattributed");
    expect(out[0].text).toContain(money(900, "BRL"));
  });

  it("stays silent below the share floor", () => {
    const out = buildApontamentos(
      base({
        spendMix: {
          teamDrivers: [{ label: "Eng", value: 9_990 }],
          unattributed: 10,
        },
      }),
    );
    expect(out).toEqual([]);
  });

  it("all currency-mix rules stay silent when the FX rate is missing", () => {
    const out = buildApontamentos(base({ spendMix: null }));
    expect(out).toEqual([]);
  });
});

describe("footer discipline", () => {
  it("caps the feed at MAX_APONTAMENTOS", () => {
    const out = buildApontamentos(
      base({
        budgetedTeams: [{ name: "Data", pctSpent: 0.6, hasWarning: false }],
        weekByTeam: [
          { name: "A", pct: 2 },
          { name: "B", pct: 1.5 },
          { name: "C", pct: 1 },
          { name: "D", pct: 0.9 },
        ],
      }),
    );
    expect(out).toHaveLength(MAX_APONTAMENTOS);
  });
});

describe("combineTeamSpend (shared spend mix)", () => {
  const input = {
    teams: [
      { id: "t1", name: "Eng" },
      { id: "t2", name: "Data" },
    ],
    seatByTeam: new Map([["t1", 300]]),
    apiUsdByTeam: new Map([
      ["t1", 100],
      ["t2", 50],
    ]),
    seatUnattributed: 40,
    apiUnattributedUsd: 10,
    fxRate: 5,
  };

  it("combines seats + API×FX per team plus the unattributed bucket", () => {
    expect(combineTeamSpend(input)).toEqual({
      teamDrivers: [
        { label: "Eng", value: 800 }, // 300 + 100×5
        { label: "Data", value: 250 },
      ],
      unattributed: 90, // 40 + 10×5
    });
  });

  it("returns null when the FX rate is missing — no dishonest mixed sum", () => {
    expect(combineTeamSpend({ ...input, fxRate: null })).toBeNull();
  });
});
