import { describe, expect, it } from "vitest";

import {
  attributeSeats,
  seatAccrual,
  type SeatSubscription,
} from "@/lib/engine/accrual";

describe("seatAccrual — daily accrual (no day-one spike)", () => {
  it("accrues only one day's slice on day 1", () => {
    // 10 seats × 300 = 3000/month; day 1 of 30 → 100, NOT 3000.
    expect(
      seatAccrual({
        seatCount: 10,
        unitPrice: 300,
        dayOfPeriod: 1,
        daysInPeriod: 30,
      }),
    ).toBe(100);
  });

  it("accrues the full month on the last day", () => {
    expect(
      seatAccrual({
        seatCount: 10,
        unitPrice: 300,
        dayOfPeriod: 30,
        daysInPeriod: 30,
      }),
    ).toBe(3000);
  });

  it("is linear at the halfway point", () => {
    expect(
      seatAccrual({
        seatCount: 4,
        unitPrice: 50,
        dayOfPeriod: 15,
        daysInPeriod: 30,
      }),
    ).toBe(100); // 200/month × 15/30
  });

  it("clamps: never below zero, never beyond the full month", () => {
    const params = { seatCount: 2, unitPrice: 100 }; // 200/month
    expect(seatAccrual({ ...params, dayOfPeriod: -3, daysInPeriod: 30 })).toBe(0);
    expect(seatAccrual({ ...params, dayOfPeriod: 99, daysInPeriod: 30 })).toBe(
      200,
    );
  });

  it("returns 0 for a degenerate period (no divide-by-zero)", () => {
    expect(
      seatAccrual({
        seatCount: 5,
        unitPrice: 10,
        dayOfPeriod: 1,
        daysInPeriod: 0,
      }),
    ).toBe(0);
  });
});

describe("attributeSeats — team attribution + reconciliation invariant", () => {
  const period = { dayOfPeriod: 30, daysInPeriod: 30 }; // full month, clean numbers

  it("groups by team and sends shared (null team) to Unattributed", () => {
    const subs: SeatSubscription[] = [
      { id: "1", tool: "ChatGPT", seatCount: 10, unitPrice: 30, teamId: "eng", teamName: "Engineering" },
      { id: "2", tool: "Claude", seatCount: 5, unitPrice: 20, teamId: "eng", teamName: "Engineering" },
      { id: "3", tool: "Copilot", seatCount: 4, unitPrice: 25, teamId: "mkt", teamName: "Marketing" },
      { id: "4", tool: "Midjourney", seatCount: 2, unitPrice: 50, teamId: null, teamName: null },
    ];
    const result = attributeSeats(subs, period);

    const eng = result.teams.find((t) => t.teamId === "eng");
    expect(eng?.accrued).toBe(10 * 30 + 5 * 20); // 400
    expect(result.teams.find((t) => t.teamId === "mkt")?.accrued).toBe(100);
    expect(result.unattributed).toBe(100); // the shared subscription
  });

  it("sorts teams descending by accrued spend", () => {
    const subs: SeatSubscription[] = [
      { id: "1", tool: "A", seatCount: 1, unitPrice: 10, teamId: "small", teamName: "Small" },
      { id: "2", tool: "B", seatCount: 1, unitPrice: 90, teamId: "big", teamName: "Big" },
    ];
    const result = attributeSeats(subs, period);
    expect(result.teams.map((t) => t.teamId)).toEqual(["big", "small"]);
  });

  it("holds the invariant: orgTotal === Σ team_totals + unattributed", () => {
    const subs: SeatSubscription[] = [
      { id: "1", tool: "A", seatCount: 7, unitPrice: 13, teamId: "eng", teamName: "Engineering" },
      { id: "2", tool: "B", seatCount: 3, unitPrice: 41, teamId: "mkt", teamName: "Marketing" },
      { id: "3", tool: "C", seatCount: 9, unitPrice: 5, teamId: null, teamName: null },
    ];
    const result = attributeSeats(subs, { dayOfPeriod: 17, daysInPeriod: 31 });
    const sumTeams = result.teams.reduce((s, t) => s + t.accrued, 0);
    expect(result.orgTotal).toBeCloseTo(sumTeams + result.unattributed, 10);
  });

  it("rounds parts to cents so displayed numbers reconcile exactly", () => {
    // 100/31 = 3.2258… per team → each part rounds to 3.23; the total must be
    // the exact sum of the ROUNDED parts (6.46), not the raw sum (6.4516…).
    const subs: SeatSubscription[] = [
      { id: "1", tool: "A", seatCount: 1, unitPrice: 100, teamId: "eng", teamName: "Engineering" },
      { id: "2", tool: "B", seatCount: 1, unitPrice: 100, teamId: null, teamName: null },
    ];
    const result = attributeSeats(subs, { dayOfPeriod: 1, daysInPeriod: 31 });
    expect(result.teams[0].accrued).toBe(3.23);
    expect(result.unattributed).toBe(3.23);
    expect(result.orgTotal).toBe(6.46);
  });

  it("empty input reconciles to zero", () => {
    const result = attributeSeats([], period);
    expect(result).toEqual({ teams: [], unattributed: 0, orgTotal: 0 });
  });
});
