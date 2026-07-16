import { describe, expect, it } from "vitest";

import { groupTeamDiagnosis, type DiagnosisUsageRow } from "@/lib/usage/diagnose";

// The one grouping pass behind every Times diagnosis card: daily series and
// by-provider split from costed rows only (uncosted flagged, never dropped —
// invariant #3), contributors with the drill-down's exact semantics (shared
// key rolls up to one team row; anonymous labels when names are hidden).

const row = (over: Partial<DiagnosisUsageRow>): DiagnosisUsageRow => ({
  teamId: "team-a",
  date: "2026-07-01",
  provider: "openai",
  userId: "user-1",
  inputTokens: 100,
  outputTokens: 50,
  derivedCost: 1,
  uncosted: false,
  ...over,
});

describe("groupTeamDiagnosis", () => {
  it("splits rows per team and accumulates the costed daily series in date order", () => {
    const byTeam = groupTeamDiagnosis(
      [
        row({ date: "2026-07-03", derivedCost: 5 }),
        row({ date: "2026-07-01", derivedCost: 2 }),
        row({ date: "2026-07-01", derivedCost: 3 }),
        row({ teamId: "team-b", date: "2026-07-02", derivedCost: 7 }),
      ],
      { namesHidden: false },
    );
    expect(byTeam.get("team-a")?.daily).toEqual([
      { date: "2026-07-01", usd: 5 },
      { date: "2026-07-03", usd: 5 },
    ]);
    expect(byTeam.get("team-b")?.daily).toEqual([{ date: "2026-07-02", usd: 7 }]);
  });

  it("splits API cost by provider, descending, from costed rows only", () => {
    const team = groupTeamDiagnosis(
      [
        row({ provider: "openai", derivedCost: 2 }),
        row({ provider: "anthropic", derivedCost: 9 }),
        row({ provider: "openai", derivedCost: 1 }),
        row({ provider: "openai", derivedCost: null, uncosted: true }),
      ],
      { namesHidden: false },
    ).get("team-a");
    expect(team?.byProvider).toEqual([
      { provider: "anthropic", usd: 9 },
      { provider: "openai", usd: 3 },
    ]);
    expect(team?.hasUncosted).toBe(true);
  });

  it("rolls a shared key (userId '') into one team-level row, ordered last", () => {
    const team = groupTeamDiagnosis(
      [
        row({ userId: "", derivedCost: 100 }),
        row({ userId: "user-1", derivedCost: 1 }),
        row({ userId: "", derivedCost: 50 }),
      ],
      { namesHidden: false },
    ).get("team-a");
    expect(team?.persons.map((p) => p.userId)).toEqual(["user-1", ""]);
    const shared = team?.persons.at(-1);
    expect(shared?.isShared).toBe(true);
    expect(shared?.derivedUsd).toBe(150);
  });

  it("keeps uncosted usage visible on the person (tokens counted, cost flagged)", () => {
    const team = groupTeamDiagnosis(
      [
        row({ userId: "user-1", derivedCost: null, uncosted: true, inputTokens: 10, outputTokens: 5 }),
      ],
      { namesHidden: false },
    ).get("team-a");
    expect(team?.persons).toHaveLength(1);
    expect(team?.persons[0]).toMatchObject({
      derivedUsd: 0,
      uncosted: true,
      inputTokens: 10,
      outputTokens: 5,
    });
  });

  it("anonymizes person ids (never shared rows) with stable per-team labels", () => {
    const byTeam = groupTeamDiagnosis(
      [
        row({ userId: "big-spender", derivedCost: 9 }),
        row({ userId: "small-spender", derivedCost: 1 }),
        row({ userId: "", derivedCost: 5 }),
        row({ teamId: "team-b", userId: "other-team-user", derivedCost: 2 }),
      ],
      { namesHidden: true },
    );
    expect(byTeam.get("team-a")?.persons.map((p) => p.userId)).toEqual([
      "Colaborador 1",
      "Colaborador 2",
      "",
    ]);
    // Labels restart per team — an id can never be correlated across cards.
    expect(byTeam.get("team-b")?.persons.map((p) => p.userId)).toEqual([
      "Colaborador 1",
    ]);
  });

  it("totalUsd is the costed sum — reconciling with the by-provider split", () => {
    const team = groupTeamDiagnosis(
      [
        row({ provider: "openai", userId: "u1", derivedCost: 2 }),
        row({ provider: "anthropic", userId: "", derivedCost: 3 }),
        row({ provider: "openai", userId: "u2", derivedCost: null, uncosted: true }),
      ],
      { namesHidden: false },
    ).get("team-a");
    expect(team?.totalUsd).toBe(5);
    expect(team?.byProvider.reduce((sum, p) => sum + p.usd, 0)).toBe(5);
  });

  it("returns an empty map for no rows", () => {
    expect(groupTeamDiagnosis([], { namesHidden: false }).size).toBe(0);
  });
});
