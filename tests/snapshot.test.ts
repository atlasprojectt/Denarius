import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SeatSubscription } from "@/lib/engine/accrual";
import { closedPeriod } from "@/lib/engine/period";
import {
  buildPeriodSnapshot,
  type PeriodSnapshotInput,
} from "@/lib/snapshot/build";
import { closeMonth, closePeriods } from "@/lib/snapshot/close";
import * as queries from "@/lib/snapshot/queries";

// The closing job's I/O edges are stubbed: the reads and the write. What is
// asserted is the rule that makes closing safe to run every single day.
const { upsert } = vi.hoisted(() => ({
  upsert: vi.fn(async () => ({ error: null })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ upsert }) }),
}));

vi.mock("@/lib/snapshot/queries", () => ({
  closedMonthInput: vi.fn(),
  closedMonths: vi.fn(),
  tenantsExistingBefore: vi.fn(),
  monthsWithCost: vi.fn(),
}));

// #94 — the frozen month. What is under test is not "does the arithmetic work"
// (the engine suites own that) but the two claims a report rests on: the month
// is captured as it WAS, and the caveats travel with the numbers.

const TEAMS = [
  { id: "t1", name: "Engenharia" },
  { id: "t2", name: "Suporte" },
];

const SUBSCRIPTIONS: SeatSubscription[] = [
  {
    id: "s1",
    tool: "Copilot",
    seatCount: 10,
    unitPrice: 100,
    teamId: "t1",
    teamName: "Engenharia",
  },
  {
    id: "s2",
    tool: "Notion AI",
    seatCount: 4,
    unitPrice: 50,
    teamId: null,
    teamName: null,
  },
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
    seats: { available: true, subscriptions: SUBSCRIPTIONS },
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
    connections: [{ provider: "openai" as const, status: "active", lastSyncAt: "2026-07-01T02:00:00.000Z" }],
    ...overrides,
  };
}

describe("buildPeriodSnapshot — the frozen month", () => {
  it("stamps the month's identity and totals", () => {
    const s = buildPeriodSnapshot(input());

    expect(s.periodMonth).toBe("2026-06-01");
    expect(s.monthLabel).toBe("junho");
    expect(s.source).toBe("auto");
    expect(s.apiUsd).toBe(150);
    // Seats accrue the FULL month: 10×100 + 4×50 = 1200.
    expect(s.seatsAmount).toBe(1_200);
    // Combined = seats + reported USD × frozen FX = 1200 + 150×5.
    expect(s.combinedAmount).toBe(1_950);
    expect(s.budgetAmount).toBe(10_000);
    expect(s.pctSpent).toBeCloseTo(0.195, 6);
    expect(s.frozenFxRate).toBe(5);
    expect(s.fxRateSource).toBe("open.er-api.com");
  });

  it("speaks about a closed month in the past tense, never as a projection", () => {
    const s = buildPeriodSnapshot(input());
    expect(s.verdictStatus).toBe("green");
    expect(s.verdictSentence).toMatch(/^Fechou /);
    expect(s.verdictSentence).not.toContain("projeção");
  });

  it("freezes a realized breach as red, naming the team that broke it", () => {
    const s = buildPeriodSnapshot(
      input({
        teamBudgets: [{ teamId: "t1", amount: 500, thresholds: [0.8, 1.0] }],
      }),
    );
    expect(s.verdictStatus).toBe("red");
    expect(s.verdictSentence).toContain("Engenharia");
    expect(s.breakdown.teams.find((t) => t.teamId === "t1")?.status).toBe("red");
  });

  it("carries every team, budgeted or not — a report shows the whole company", () => {
    const s = buildPeriodSnapshot(input());
    const t2 = s.breakdown.teams.find((t) => t.teamId === "t2");

    expect(s.breakdown.teams).toHaveLength(2);
    // Un-budgeted team: real spend, no budget, no status.
    expect(t2?.spend).toBe(200); // 40 USD × 5
    expect(t2?.budget).toBeNull();
    expect(t2?.status).toBeNull();
    expect(t2?.pctSpent).toBeNull();
  });

  it("captures the seat configuration, and a later edit cannot reach the month", () => {
    const subscriptions = SUBSCRIPTIONS.map((s) => ({ ...s }));
    const s = buildPeriodSnapshot(input({ seats: { available: true, subscriptions } }));

    // Someone doubles the Copilot seats the day after the month closed.
    subscriptions[0].seatCount = 20;

    const copilot = s.breakdown.seats.subscriptions.find((x) => x.tool === "Copilot");
    expect(copilot).toEqual({
      tool: "Copilot",
      seatCount: 10,
      unitPrice: 100,
      teamId: "t1",
      teamName: "Engenharia",
      monthlyTotal: 1_000,
    });
    expect(s.seatsAmount).toBe(1_200);
  });

  it("never stores a person — the frozen month is team-aggregate only", () => {
    const s = buildPeriodSnapshot(input());
    const serialized = JSON.stringify(s);

    expect(serialized).not.toMatch(/user_id|userId|person|email/i);
    for (const team of s.breakdown.teams) {
      expect(Object.keys(team).sort()).toEqual([
        "budget",
        "pctSpent",
        "projection",
        "spend",
        "status",
        "teamId",
        "teamName",
      ]);
    }
  });

  it("ranks the month's top drivers, Unattributed included", () => {
    const s = buildPeriodSnapshot(input());
    // Engenharia 1000 seats + 100×5 = 1500; Suporte 200; Unattributed 200 seats + 50.
    expect(s.breakdown.topDrivers[0].label).toBe("Engenharia");
    expect(s.breakdown.topDrivers.map((d) => d.label)).toContain("Não atribuído");
  });
});

describe("buildPeriodSnapshot — the honesty flags travel with the numbers", () => {
  it("discloses missing FX instead of guessing a conversion", () => {
    const s = buildPeriodSnapshot(input({ fx: null }));

    expect(s.fxMissing).toBe(true);
    expect(s.combinedAmount).toBeNull();
    expect(s.pctSpent).toBeNull();
    expect(s.verdictStatus).toBeNull();
    expect(s.breakdown.teams.every((t) => t.spend === null)).toBe(true);
    expect(s.breakdown.providers.every((p) => p.display === null)).toBe(true);
    // The USD side is still reported — the gap is shown, never dropped.
    expect(s.apiUsd).toBe(150);
  });

  it("does not call FX missing when there was no dollar to convert", () => {
    const s = buildPeriodSnapshot(
      input({
        fx: null,
        apiUsdByTeam: new Map(),
        apiUnattributedUsd: 0,
        reportedByProvider: [],
        derivedUsd: 0,
      }),
    );

    expect(s.fxMissing).toBe(false);
    expect(s.combinedAmount).toBe(1_200);
    expect(s.verdictStatus).toBe("green");
  });

  it("freezes the uncosted-model caveat", () => {
    expect(buildPeriodSnapshot(input({ hasUncosted: true })).hasUncosted).toBe(true);
    expect(buildPeriodSnapshot(input()).hasUncosted).toBe(false);
  });

  it("freezes the reconciliation outcome", () => {
    expect(buildPeriodSnapshot(input()).reconciliationOk).toBe(true);
    // Derived far below what the providers billed: the gap is recorded, not hidden.
    const drifted = buildPeriodSnapshot(input({ derivedUsd: 60 }));
    expect(drifted.reconciliationOk).toBe(false);
    expect(drifted.breakdown.reconciliation.driftUsd).toBe(90);
  });

  it("flags a connector that had not synced by the time the month ended", () => {
    const stale = buildPeriodSnapshot(
      input({ connections: [{ provider: "openai" as const, status: "active", lastSyncAt: "2026-06-28T00:00:00.000Z" }] }),
    );
    expect(stale.staleSync).toBe(true);

    const never = buildPeriodSnapshot(
      input({ connections: [{ provider: "openai" as const, status: "active", lastSyncAt: null }] }),
    );
    expect(never.staleSync).toBe(true);

    // A connection the tenant deliberately revoked is not a data-quality problem.
    const revoked = buildPeriodSnapshot(
      input({ connections: [{ provider: "openai" as const, status: "revoked", lastSyncAt: null }] }),
    );
    expect(revoked.staleSync).toBe(false);
  });
});

describe("buildPeriodSnapshot — a backfilled month", () => {
  function backfilled() {
    return buildPeriodSnapshot(
      input({ source: "backfill", seats: { available: false } }),
    );
  }

  it("records what survived: the API side", () => {
    const snapshot = backfilled();
    expect(snapshot.source).toBe("backfill");
    expect(snapshot.apiUsd).toBe(150);
    expect(snapshot.breakdown.providers).toHaveLength(2);
  });

  it("discloses seats as unavailable rather than as zero", () => {
    const snapshot = backfilled();
    expect(snapshot.breakdown.seats.available).toBe(false);
    expect(snapshot.seatsAmount).toBeNull();
    expect(snapshot.breakdown.seats.total).toBeNull();
    expect(snapshot.breakdown.seats.subscriptions).toEqual([]);
  });

  it("gives no verdict it cannot stand behind", () => {
    const snapshot = backfilled();
    // Half the spend is unknown, so there is no honest total to judge.
    expect(snapshot.combinedAmount).toBeNull();
    expect(snapshot.verdictStatus).toBeNull();
    expect(snapshot.verdictSentence).toBeNull();
    expect(snapshot.breakdown.teams.every((t) => t.spend === null)).toBe(true);
  });
});

// #96 — the SAME builder over the month still running. What is under test is
// that "live" changes exactly what it should (projection, tense, staleness) and
// nothing else: a partial report and a closed one are the same document.
describe("buildPeriodSnapshot — the month in flight", () => {
  /** Day `day` of June 2026 (30 days), with the same money as the closed case. */
  function live(day: number, overrides: Partial<PeriodSnapshotInput> = {}) {
    const closed = closedPeriod(2026, 6);
    return buildPeriodSnapshot(
      input({
        period: { ...closed, dayOfPeriod: day },
        closed: false,
        source: "live",
        closedAt: `2026-06-${String(day).padStart(2, "0")}T12:00:00.000Z`,
        connections: [
          {
            provider: "openai" as const,
            status: "active",
            lastSyncAt: `2026-06-${String(day).padStart(2, "0")}T06:00:00.000Z`,
          },
        ],
        ...overrides,
      }),
    );
  }

  it("carries where the month is, not just which month it is", () => {
    const snapshot = live(10);
    expect(snapshot.source).toBe("live");
    expect(snapshot.periodMonth).toBe("2026-06-01");
    expect(snapshot.dayOfPeriod).toBe(10);
    expect(snapshot.daysInPeriod).toBe(30);
  });

  it("projects the close at run-rate once the pace is established", () => {
    // Day 10 of 30: seats accrue pro-rata (1200 × 10/30 = 400) on top of the
    // API's 150 USD × 5 = 750, so 1150 to date → run-rate close of 3450.
    const snapshot = live(10);
    expect(snapshot.combinedAmount).toBe(1_150);
    expect(snapshot.projection).toBeCloseTo(3_450, 6);
  });

  it("refuses to project before day 5 (invariant #5)", () => {
    const snapshot = live(3);
    expect(snapshot.projection).toBeNull();
    // The spend itself is still reported — only the extrapolation is withheld.
    expect(snapshot.combinedAmount).toBe(870);
  });

  it("uses the live connector rule for staleness, not the month's end", () => {
    // Synced six hours ago: fresh. Under the closed rule every mid-month
    // connection would trivially predate the month's end and read as stale.
    expect(live(10).staleSync).toBe(false);

    const stale = live(10, {
      connections: [
        {
          provider: "openai" as const,
          status: "active",
          lastSyncAt: "2026-06-05T06:00:00.000Z",
        },
      ],
    });
    expect(stale.staleSync).toBe(true);
  });

  it("leaves a closed month exactly as it was (the default is still closed)", () => {
    const closed = buildPeriodSnapshot(input());
    expect(closed.dayOfPeriod).toBe(30);
    expect(closed.daysInPeriod).toBe(30);
    // A fully elapsed month has nothing left to project: run-rate lands on the
    // realized total.
    expect(closed.projection).toBeCloseTo(closed.combinedAmount as number, 6);
    expect(closed.staleSync).toBe(false);
  });
});

describe("buildPeriodSnapshot — a month with no budget", () => {
  it("has no verdict and no percentage, but still reports the spend", () => {
    const unbudgeted = buildPeriodSnapshot(input({ orgBudget: null, teamBudgets: [] }));
    expect(unbudgeted.verdictStatus).toBeNull();
    expect(unbudgeted.budgetAmount).toBeNull();
    expect(unbudgeted.pctSpent).toBeNull();
    expect(unbudgeted.combinedAmount).toBe(1_950);
    expect(unbudgeted.breakdown.teams.find((t) => t.teamId === "t1")?.spend).toBe(1_500);
  });
});

describe("closeMonth — closing is idempotent", () => {
  const mocked = vi.mocked(queries);

  beforeEach(() => {
    upsert.mockReset();
    upsert.mockResolvedValue({ error: null });
    mocked.closedMonthInput.mockReset();
    mocked.closedMonths.mockReset();
    mocked.tenantsExistingBefore.mockReset();
    mocked.monthsWithCost.mockReset();
    mocked.closedMonthInput.mockImplementation(
      async (_tenantId, year, month, options) =>
        input({
          period: closedPeriod(year, month),
          source: options.source,
          closedAt: options.closedAt,
        }),
    );
  });

  it("freezes a month that has not been frozen yet", async () => {
    mocked.closedMonths.mockResolvedValue(new Set<string>());

    const outcome = await closeMonth("tenant-1", 2026, 6, "auto");

    expect(outcome).toBe("created");
    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, options] = upsert.mock.calls[0] as unknown as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(row.tenant_id).toBe("tenant-1");
    expect(row.period_month).toBe("2026-06-01");
    expect(row.verdict_status).toBe("green");
    // The unique key absorbs a race with a concurrent run rather than
    // overwriting a month someone may already have printed.
    expect(options).toEqual({
      onConflict: "tenant_id,period_month",
      ignoreDuplicates: true,
    });
  });

  it("a second run writes nothing — a frozen month is never rewritten", async () => {
    mocked.closedMonths.mockResolvedValue(new Set(["2026-06-01"]));

    const outcome = await closeMonth("tenant-1", 2026, 6, "auto");

    expect(outcome).toBe("exists");
    expect(upsert).not.toHaveBeenCalled();
    // It does not even read the month back: nothing can be recomputed.
    expect(mocked.closedMonthInput).not.toHaveBeenCalled();
  });

  it("reports a failed write instead of claiming the month was closed", async () => {
    mocked.closedMonths.mockResolvedValue(new Set<string>());
    upsert.mockResolvedValueOnce({ error: { message: "boom" } } as never);

    expect(await closeMonth("tenant-1", 2026, 6, "auto")).toBe("failed");
  });

  it("reports a failed read instead of freezing zero-filled defaults", async () => {
    mocked.closedMonths.mockResolvedValue(new Set<string>());
    mocked.closedMonthInput.mockRejectedValueOnce(new Error("database unavailable"));

    expect(await closeMonth("tenant-1", 2026, 6, "auto")).toBe("failed");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("closes each tenant and advances only one backfill month per run", async () => {
    const now = new Date("2026-07-07T11:00:00.000Z");
    mocked.tenantsExistingBefore.mockResolvedValue(["tenant-a", "tenant-b"]);
    mocked.closedMonths
      .mockResolvedValueOnce(new Set(["2026-06-01", "2026-05-01"]))
      .mockResolvedValueOnce(new Set<string>());
    mocked.monthsWithCost
      .mockResolvedValueOnce(["2026-05-01"])
      .mockResolvedValueOnce(["2026-05-01", "2026-04-01"]);

    await expect(closePeriods(now)).resolves.toEqual({
      tenants: 2,
      created: 1,
      backfilled: 1,
      failed: 0,
    });

    expect(mocked.closedMonthInput).toHaveBeenNthCalledWith(
      1,
      "tenant-b",
      2026,
      6,
      { source: "auto", closedAt: now.toISOString() },
    );
    expect(mocked.closedMonthInput).toHaveBeenNthCalledWith(
      2,
      "tenant-b",
      2026,
      5,
      { source: "backfill", closedAt: now.toISOString() },
    );
    expect(mocked.closedMonthInput).toHaveBeenCalledTimes(2);
    expect(mocked.monthsWithCost).toHaveBeenCalledWith(
      "tenant-b",
      "2025-06-01",
      "2026-06-01",
    );
  });

  it("contains one tenant's failure and still closes the next tenant", async () => {
    mocked.tenantsExistingBefore.mockResolvedValue(["tenant-a", "tenant-b"]);
    mocked.closedMonths
      .mockRejectedValueOnce(new Error("tenant-a read failed"))
      .mockResolvedValueOnce(new Set<string>());
    mocked.monthsWithCost.mockResolvedValue([]);

    await expect(
      closePeriods(new Date("2026-07-07T11:00:00.000Z")),
    ).resolves.toEqual({
      tenants: 2,
      created: 1,
      backfilled: 0,
      failed: 1,
    });
    expect(mocked.closedMonthInput).toHaveBeenCalledWith(
      "tenant-b",
      2026,
      6,
      expect.objectContaining({ source: "auto" }),
    );
  });
});
