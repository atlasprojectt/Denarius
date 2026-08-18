import { describe, expect, it } from "vitest";

import {
  buildCockpit,
  type CockpitInput,
} from "@/lib/engine/cockpit";
import {
  buildBudgetNotifications,
  compactNotificationCount,
  notificationTriggerTone,
  type BudgetNotification,
} from "@/lib/home/notifications";

const scope = (budget: number, spent: number) => ({
  budget,
  seatDisplay: spent,
  apiUsd: 0,
  fxRate: 1,
  thresholds: [0.8, 1],
});

const input = (overrides: Partial<CockpitInput> = {}): CockpitInput => ({
  period: { dayOfPeriod: 15, daysInPeriod: 30 },
  currency: "BRL",
  periodEndLabel: "30 de agosto",
  org: scope(5_000, 1_000),
  teams: [],
  composition: [],
  ...overrides,
});

describe("buildBudgetNotifications", () => {
  it("states a realized team breach as a factual notification", () => {
    const cockpit = buildCockpit(
      input({
        teams: [
          {
            ...scope(500, 600),
            teamId: "marketing",
            teamName: "Marketing",
          },
        ],
      }),
    );

    const notifications = buildBudgetNotifications(cockpit);

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      title: "Marketing estourou o orçamento em 20%",
      href: "/times/marketing",
      level: "breach",
    });
    expect(notifications[0].detail).toContain("600,00");
    expect(notifications[0].detail).toContain("500,00");
  });

  it("surfaces an org projected breach with deterministic numbers", () => {
    const cockpit = buildCockpit(input({ org: scope(1_000, 600) }));

    const notifications = buildBudgetNotifications(cockpit);

    expect(notifications[0]).toMatchObject({
      title: "Empresa pode fechar 20% acima do orçamento",
      href: "/",
      level: "projected_breach",
    });
    expect(notifications[0].detail).toContain("1.200,00");
  });

  it("uses the active warning threshold without inventing a recommendation", () => {
    const cockpit = buildCockpit(
      input({
        period: { dayOfPeriod: 30, daysInPeriod: 30 },
        teams: [
          {
            ...scope(500, 400),
            teamId: "data",
            teamName: "Data",
          },
        ],
      }),
    );

    const notifications = buildBudgetNotifications(cockpit);

    expect(notifications[0].title).toBe("Data atingiu 80% do orçamento");
    expect(notifications[0].level).toBe("warning");
  });

  it("returns no notifications during cold start", () => {
    expect(buildBudgetNotifications(buildCockpit(input({ org: null })))).toEqual(
      [],
    );
  });
});

describe("notification trigger presentation", () => {
  const item = (level: BudgetNotification["level"]): BudgetNotification => ({
    id: level,
    title: "Alerta",
    detail: "Detalhe",
    href: "/",
    level,
  });

  it("caps only the visual count while preserving small exact values", () => {
    expect(compactNotificationCount(0)).toBe("0");
    expect(compactNotificationCount(9)).toBe("9");
    expect(compactNotificationCount(10)).toBe("9+");
  });

  it("uses breach as the worst trigger tone", () => {
    expect(notificationTriggerTone([])).toBeNull();
    expect(notificationTriggerTone([item("warning")])).toBe("amber");
    expect(notificationTriggerTone([item("projected_breach")])).toBe("amber");
    expect(
      notificationTriggerTone([item("warning"), item("breach")]),
    ).toBe("destructive");
  });
});
