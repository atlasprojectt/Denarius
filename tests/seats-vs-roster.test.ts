import { describe, expect, it } from "vitest";

import type { SeatSubscription } from "@/lib/engine/accrual";
import {
  buildSeatWaste,
  MAX_SEAT_WASTE,
  type SeatWasteInput,
} from "@/lib/findings/seats-vs-roster";
import { money } from "@/lib/money";

function sub(overrides: Partial<SeatSubscription> = {}): SeatSubscription {
  return {
    id: "s1",
    tool: "Copilot",
    seatCount: 50,
    unitPrice: 102.5,
    teamId: null,
    teamName: null,
    ...overrides,
  };
}

function base(overrides: Partial<SeatWasteInput> = {}): SeatWasteInput {
  return {
    currency: "BRL",
    subscriptions: [],
    peopleByTeam: new Map<string, number>(),
    totalPeople: 0,
    ...overrides,
  };
}

describe("buildSeatWaste — the issue's own example", () => {
  it("50 Copilot seats vs 42 roster people → 8 unowned ≈ R$ 820/mo", () => {
    const out = buildSeatWaste(
      base({ subscriptions: [sub()], totalPeople: 42 }),
    );
    expect(out).toHaveLength(1);
    expect(out[0].excessSeats).toBe(8);
    expect(out[0].monthlySavings).toBe(820);
    expect(out[0].text).toBe(
      `Copilot: 50 assentos pagos para 42 pessoas no roster — 8 sem dono, ≈ ${money(820, "BRL")}/mês.`,
    );
  });
});

describe("no-finding cases (acceptance)", () => {
  it("no finding when seats ≤ people", () => {
    const out = buildSeatWaste(
      base({ subscriptions: [sub({ seatCount: 42 })], totalPeople: 42 }),
    );
    expect(out).toEqual([]);
  });

  it("no claim against an empty roster — nothing proven, nothing said", () => {
    const out = buildSeatWaste(base({ subscriptions: [sub()], totalPeople: 0 }));
    expect(out).toEqual([]);
  });

  it("a team-bound subscription with no people on THAT team stays silent", () => {
    const out = buildSeatWaste(
      base({
        subscriptions: [sub({ teamId: "t1", teamName: "Data" })],
        peopleByTeam: new Map(),
        totalPeople: 42, // whole roster is irrelevant for a team-bound sub
      }),
    );
    expect(out).toEqual([]);
  });
});

describe("denominators", () => {
  it("team-bound subscriptions compare against that team's headcount", () => {
    const out = buildSeatWaste(
      base({
        subscriptions: [
          sub({ id: "s2", teamId: "t1", teamName: "Data", seatCount: 12, unitPrice: 30 }),
        ],
        peopleByTeam: new Map([["t1", 8]]),
        totalPeople: 100,
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0].excessSeats).toBe(4);
    expect(out[0].monthlySavings).toBe(120);
    expect(out[0].text).toContain("Copilot (Data)");
  });
});

describe("secondary discipline", () => {
  it("orders by savings and caps at MAX_SEAT_WASTE", () => {
    const subscriptions = [
      sub({ id: "a", tool: "A", seatCount: 12, unitPrice: 10 }), // 20/mo
      sub({ id: "b", tool: "B", seatCount: 14, unitPrice: 50 }), // 200/mo
      sub({ id: "c", tool: "C", seatCount: 11, unitPrice: 100 }), // 100/mo
      sub({ id: "d", tool: "D", seatCount: 13, unitPrice: 20 }), // 60/mo
    ];
    const out = buildSeatWaste(base({ subscriptions, totalPeople: 10 }));
    expect(out).toHaveLength(MAX_SEAT_WASTE);
    expect(out.map((f) => f.tool)).toEqual(["B", "C", "D"]);
  });
});
