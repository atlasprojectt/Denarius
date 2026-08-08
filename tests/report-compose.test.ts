import { describe, expect, it } from "vitest";

import { closedPeriod } from "@/lib/engine/period";
import { composeReport } from "@/lib/reports/compose";
import {
  buildPeriodSnapshot,
  type PeriodSnapshot,
  type PeriodSnapshotInput,
} from "@/lib/snapshot/build";

// #97 — the composer. What is under test is not the arithmetic (the engine
// suites own that) but the three claims the document rests on: it states the
// conclusion first, it orders by materiality, and it never puts a number on
// paper that the snapshot did not assert.

const TEAMS = [
  { id: "t1", name: "Engenharia" },
  { id: "t2", name: "Suporte" },
  { id: "t3", name: "Vendas" },
  { id: "t4", name: "Produto" },
];

function input(overrides: Partial<PeriodSnapshotInput> = {}): PeriodSnapshotInput {
  return {
    period: closedPeriod(2026, 6),
    currency: "BRL",
    source: "auto",
    closedAt: "2026-07-01T03:00:00.000Z",
    orgBudget: { amount: 10_000, thresholds: [0.8, 1.0] },
    teamBudgets: [{ teamId: "t1", amount: 4_000, thresholds: [0.8, 1.0] }],
    fx: { rate: 5, source: "open.er-api.com", date: "2026-06-01" },
    teams: TEAMS,
    seats: {
      available: true,
      subscriptions: [
        {
          id: "s1",
          tool: "Copilot",
          seatCount: 10,
          unitPrice: 100,
          teamId: "t1",
          teamName: "Engenharia",
        },
      ],
    },
    apiUsdByTeam: new Map([
      ["t1", 100],
      ["t2", 40],
    ]),
    apiUnattributedUsd: 10,
    reportedByProvider: [
      { provider: "openai", usd: 100 },
      { provider: "anthropic", usd: 50 },
    ],
    derivedUsd: 150,
    hasUncosted: false,
    connections: [
      {
        provider: "openai" as const,
        status: "active",
        lastSyncAt: "2026-07-01T02:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function snapshot(overrides: Partial<PeriodSnapshotInput> = {}): PeriodSnapshot {
  return buildPeriodSnapshot(input(overrides));
}

describe("composeReport — the conclusion comes first", () => {
  it("leads with the verdict, not with the evidence", () => {
    const s = snapshot();
    const report = composeReport(s, "closed");
    expect(report.summary.lead).toBe(s.verdictSentence);
    expect(report.summary.lead).not.toBeNull();
  });

  it("carries no lead when the period had no verdict to give", () => {
    const report = composeReport(
      snapshot({ orgBudget: null, teamBudgets: [] }),
      "closed",
    );
    expect(report.summary.lead).toBeNull();
    // The spend is still reported — no verdict is not no document.
    expect(report.summary.figures.find((f) => f.id === "spent")?.value).toContain(
      "1.750",
    );
  });

  it("drops the projection pair when there is no budget to project against", () => {
    const report = composeReport(
      snapshot({ orgBudget: null, teamBudgets: [] }),
      "closed",
    );
    expect(report.summary.figures.map((f) => f.id)).toEqual(["spent", "budget"]);
  });
});

describe("composeReport — materiality decides the order", () => {
  /** Engenharia breaches (budget 500 against ~1500 spent); Suporte only warns. */
  function crossing() {
    return snapshot({
      teamBudgets: [
        { teamId: "t1", amount: 500, thresholds: [0.8, 1.0] },
        { teamId: "t2", amount: 210, thresholds: [0.8, 1.0] },
      ],
    });
  }

  it("ranks a realized breach above a warning", () => {
    const report = composeReport(crossing(), "closed");
    const kinds = report.attention.observations.map((o) => o.kind);
    expect(kinds[0]).toBe("breach");
    expect(kinds.indexOf("breach")).toBeLessThan(kinds.indexOf("quality"));
  });

  it("puts troubled teams before big ones, and names the residue last", () => {
    const report = composeReport(crossing(), "closed");
    // Engenharia is both red and largest; Suporte is amber but smaller than
    // an unbudgeted team would be — severity still wins.
    expect(report.teams[0].teamName).toBe("Engenharia");
    expect(report.teams[0].status).toBe("red");
    expect(report.teams[1].teamName).toBe("Suporte");
    // Σ teams + Unattributed = the org total (invariant #3).
    const teamSum = report.teams.reduce((sum, t) => sum + (t.spend ?? 0), 0);
    expect(teamSum + (report.unattributed.amount ?? 0)).toBeCloseTo(1_750, 6);
  });

  it("drops a team that has neither budget nor spend, without losing money", () => {
    // Vendas and Produto never spent and were never budgeted: rows of zeros in
    // an executive table are noise. The column still sums to the org total.
    const report = composeReport(crossing(), "closed");
    expect(report.teams.map((t) => t.teamName)).toEqual(["Engenharia", "Suporte"]);
    const teamSum = report.teams.reduce((sum, t) => sum + (t.spend ?? 0), 0);
    expect(teamSum + (report.unattributed.amount ?? 0)).toBeCloseTo(1_750, 6);
  });

  it("keeps a budgeted team that spent nothing — the budget is the fact", () => {
    const report = composeReport(
      snapshot({
        teamBudgets: [{ teamId: "t3", amount: 1_000, thresholds: [0.8, 1.0] }],
      }),
      "closed",
    );
    // t3 is Vendas: budgeted, no spend — it stays, judged against its budget.
    const budgetedIdle = report.teams.find((t) => t.teamName === "Vendas");
    expect(budgetedIdle?.spend).toBe(0);
    expect(budgetedIdle?.budget).toBe(1_000);
    // t4 is Produto: no budget, no spend — nothing to say, so no row.
    expect(report.teams.find((t) => t.teamName === "Produto")).toBeUndefined();
  });

  it("carries every team's share of the period", () => {
    const report = composeReport(crossing(), "closed");
    const total = report.teams.reduce((sum, t) => sum + (t.share ?? 0), 0);
    expect(total + (report.unattributed.share ?? 0)).toBeCloseTo(1, 6);
  });

  it("summarises only the top statements, keeping the rest in the section", () => {
    const report = composeReport(
      snapshot({
        hasUncosted: true,
        derivedUsd: 60,
        teamBudgets: [{ teamId: "t1", amount: 500, thresholds: [0.8, 1.0] }],
      }),
      "closed",
    );
    expect(report.summary.highlights.length).toBe(3);
    expect(report.statements.length).toBeGreaterThan(3);
    // The summary is the HEAD of the one ranking, never a different selection.
    expect(report.summary.highlights).toEqual(report.statements.slice(0, 3));
    // …and §5 is the actionable SUBSET of that same ranking, in the same order.
    expect(report.attention.observations).toEqual(
      report.statements.filter((s) => s.attention),
    );
    // One ranking means the weights only ever descend.
    const weights = report.statements.map((s) => s.weight);
    expect(weights).toEqual([...weights].sort((a, b) => b - a));
  });
});

describe("composeReport — §3 closes", () => {
  it("adds provider spend and seats up to the period total", () => {
    const report = composeReport(snapshot(), "closed");
    expect(report.compositionBalances).toBe(true);
    const sum = report.composition.reduce((acc, r) => acc + (r.amount ?? 0), 0);
    expect(sum).toBeCloseTo(1_750, 6);
  });

  it("refuses to claim balance when a row could not be converted", () => {
    // No frozen FX and real USD spend: the provider rows are unavailable.
    const report = composeReport(snapshot({ fx: null }), "closed");
    expect(report.compositionBalances).toBe(false);
    expect(report.composition.some((r) => r.amount === null)).toBe(true);
  });

  it("keeps the USD original beside every converted provider row", () => {
    const report = composeReport(snapshot(), "closed");
    const openai = report.composition.find((r) => r.id === "provider:openai");
    expect(openai?.usd).toBe(100);
  });
});

describe("composeReport — emphasis, not reordering", () => {
  it("collapses a composition with a single source of spend", () => {
    const report = composeReport(
      snapshot({
        reportedByProvider: [{ provider: "openai", usd: 100 }],
        seats: { available: true, subscriptions: [] },
        derivedUsd: 100,
      }),
      "closed",
    );
    expect(report.emphasis.composition).toBe("collapsed");
  });

  it("collapses the teams section when there is nothing to compare", () => {
    const report = composeReport(
      snapshot({
        teams: [{ id: "t1", name: "Engenharia" }],
        teamBudgets: [],
        apiUsdByTeam: new Map([["t1", 150]]),
        apiUnattributedUsd: 0,
      }),
      "closed",
    );
    expect(report.emphasis.teams).toBe("collapsed");
  });

  it("collapses attention to the affirmative all-clear when nothing points anywhere", () => {
    // Comfortable budget, everything attributed, spend spread evenly enough
    // that the top three do not concentrate it.
    const report = composeReport(
      snapshot({
        orgBudget: { amount: 100_000, thresholds: [0.8, 1.0] },
        teamBudgets: [],
        teams: [...TEAMS, { id: "t5", name: "Dados" }],
        // Five teams at 30 USD each: the top three carry 60%, under the
        // concentration threshold, so there is nothing to point at.
        apiUsdByTeam: new Map([
          ["t1", 30],
          ["t2", 30],
          ["t3", 30],
          ["t4", 30],
          ["t5", 30],
        ]),
        apiUnattributedUsd: 0,
        reportedByProvider: [{ provider: "openai", usd: 150 }],
        seats: { available: true, subscriptions: [] },
      }),
      "closed",
    );
    expect(report.attention.observations).toEqual([]);
    expect(report.emphasis.attention).toBe("collapsed");
    // The period is still characterized — collapsing §5 never blanks §1.
    expect(report.summary.lead).not.toBeNull();
  });

  it("keeps characterization out of the attention section", () => {
    const report = composeReport(
      snapshot({ hasUncosted: true, derivedUsd: 60 }),
      "closed",
    );
    const ids = report.attention.observations.map((o) => o.id);
    // A reconciliation gap and an unpriced model qualify the numbers; the annex
    // answers them. "57% vem de assentos" describes, it does not ask.
    expect(ids).not.toContain("reconciliation");
    expect(ids).not.toContain("uncosted");
    expect(ids).not.toContain("composition");
    // …but they are all still on the record in the annex.
    expect(
      report.annex.caveats.filter((c) => c.flagged).map((c) => c.id).sort(),
    ).toEqual(["reconciliation", "uncosted"]);
  });

  it("never steps down the conclusion, the money or the annex", () => {
    const report = composeReport(snapshot(), "closed");
    expect(report.emphasis.summary).toBe("headline");
    expect(report.emphasis.position).toBe("headline");
    expect(report.emphasis.annex).toBe("normal");
    expect(report.annex.caveats.map((c) => c.id)).toEqual([
      "uncosted",
      "reconciliation",
      "fx",
      "sync",
    ]);
  });
});

describe("composeReport — advice belongs to the month still running", () => {
  function breaching(closed: boolean) {
    return buildPeriodSnapshot(
      input({
        closed,
        source: closed ? "auto" : "live",
        period: closed
          ? closedPeriod(2026, 6)
          : { ...closedPeriod(2026, 6), dayOfPeriod: 20 },
        teamBudgets: [{ teamId: "t1", amount: 500, thresholds: [0.8, 1.0] }],
      }),
    );
  }

  it("recommends curated actions on the live report", () => {
    const report = composeReport(breaching(false), "live");
    expect(report.attention.actions.length).toBeGreaterThan(0);
    // Every action names the finding that earned it.
    expect(report.attention.actions.every((a) => a.context.length > 0)).toBe(true);
    // Deduplicated across findings — one action, once.
    const ids = report.attention.actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("documents a closed month without advising on it", () => {
    const report = composeReport(breaching(true), "closed");
    expect(report.attention.actions).toEqual([]);
    // The crossing itself is still on the record.
    expect(report.attention.observations.some((o) => o.kind === "breach")).toBe(true);
  });

  it("only draws actions from the curated catalog", () => {
    const s = breaching(false);
    const report = composeReport(s, "live");
    const catalogIds = new Set(
      s.breakdown.findings.flatMap((f) => f.controlPlan.map((a) => a.id)),
    );
    for (const action of report.attention.actions) {
      expect(catalogIds.has(action.id)).toBe(true);
    }
  });
});

describe("composeReport — invariant #2: no number the snapshot did not assert", () => {
  it("emits only figures traceable to the snapshot", () => {
    const s = snapshot({
      hasUncosted: true,
      derivedUsd: 60,
      teamBudgets: [{ teamId: "t1", amount: 500, thresholds: [0.8, 1.0] }],
    });
    const report = composeReport(s, "closed");

    // Every distinct number the document says, in the order it says it.
    const emitted = [
      ...report.summary.figures.map((f) => f.value),
      ...report.attention.observations.map((o) => o.text),
    ]
      .join(" ")
      .match(/\d[\d.,]*/g);

    // The permitted vocabulary: every value the snapshot holds, formatted the
    // same way the composer formats it. If the composer ever derives a figure
    // of its own, it will not appear here and this fails — the same guarantee
    // `narrationIsSafe` gives the digest.
    const permitted = new Set<string>();
    const record = (value: number) => {
      permitted.add(
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
          .format(value)
          .replace(/[^\d.,]/g, "")
          .trim(),
      );
      permitted.add(
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" })
          .format(value)
          .replace(/[^\d.,]/g, "")
          .trim(),
      );
      permitted.add(new Intl.NumberFormat("pt-BR", { style: "percent" }).format(value));
      permitted.add(String(value));
    };

    for (const value of [
      s.combinedAmount,
      s.budgetAmount,
      s.projection,
      s.apiUsd,
      s.seatsAmount,
      s.pctSpent,
      s.breakdown.unattributed.display,
      s.breakdown.unattributed.apiUsd,
      Math.abs(s.breakdown.reconciliation.driftUsd),
      s.budgetAmount !== null && s.projection !== null
        ? s.budgetAmount - s.projection
        : null,
      s.combinedAmount !== null && s.seatsAmount !== null
        ? s.combinedAmount - s.seatsAmount
        : null,
      s.breakdown.topDrivers.reduce((sum, d) => sum + d.share, 0),
      ...s.breakdown.findings.flatMap((f) => [
        f.numbers.budget,
        f.numbers.spent,
        f.numbers.projection,
        f.numbers.pctSpent,
        f.overrun,
      ]),
      ...s.breakdown.teams.map((t) => t.spend),
      ...s.breakdown.seats.subscriptions.map((sub) => sub.monthlyTotal),
    ]) {
      if (value !== null) record(value);
    }
    // Percentages round to whole numbers on screen, so allow the rounded form
    // of every fraction the snapshot holds.
    for (const fraction of [
      s.pctSpent,
      s.breakdown.topDrivers.reduce((sum, d) => sum + d.share, 0),
      s.combinedAmount !== null && s.seatsAmount !== null && s.combinedAmount > 0
        ? s.seatsAmount / s.combinedAmount
        : null,
      s.combinedAmount !== null && s.seatsAmount !== null && s.combinedAmount > 0
        ? 1 - s.seatsAmount / s.combinedAmount
        : null,
      s.combinedAmount !== null && s.breakdown.unattributed.display !== null && s.combinedAmount > 0
        ? s.breakdown.unattributed.display / s.combinedAmount
        : null,
      ...s.breakdown.findings.map((f) => f.numbers.pctSpent),
    ]) {
      if (fraction !== null) permitted.add(`${Math.round(fraction * 100)}`);
    }

    for (const token of emitted ?? []) {
      expect(permitted.has(token), `"${token}" is not a snapshot figure`).toBe(true);
    }
  });
});
