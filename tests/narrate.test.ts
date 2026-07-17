import { afterEach, describe, expect, it } from "vitest";

import { weekOverWeek } from "@/lib/engine/week-change";
import { money } from "@/lib/money";
import { anthropicNarrator } from "@/lib/narrate/client";
import {
  buildDigestFacts,
  digestPrompt,
  digestTemplate,
  injectedStrings,
  narrationIsSafe,
  type DigestFacts,
} from "@/lib/narrate/digest";

const NOW = new Date("2026-07-20T12:00:00Z");

function facts(overrides: Partial<DigestFacts> = {}): DigestFacts {
  return buildDigestFacts({
    verdict: {
      status: "amber",
      sentence: "Atenção — projeção de R$ 2.000,00 acima do orçamento.",
      teamId: null,
    },
    monthLabel: "julho",
    currency: "BRL",
    spent: 8_500,
    budget: 10_000,
    pctSpent: 0.85,
    projection: 12_000,
    projectedMargin: -2_000,
    weekChange: { currentUsd: 550, previousUsd: 500, pct: 0.1 },
    drivers: [
      { label: "Marketing", value: 4_000, share: 0.47 },
      { label: "Engenharia", value: 3_000, share: 0.35 },
    ],
    ...overrides,
  });
}

describe("weekOverWeek", () => {
  const rows = [
    { date: "2026-07-19", amount: 100 }, // current week
    { date: "2026-07-14", amount: 200 }, // current week
    { date: "2026-07-12", amount: 150 }, // previous week
    { date: "2026-07-07", amount: 50 }, // previous week
    { date: "2026-07-01", amount: 999 }, // outside both windows
    { date: "2026-07-20", amount: 999 }, // today: excluded (partial day)
  ];

  it("splits the last 14 days into two 7-day windows", () => {
    expect(weekOverWeek(rows, NOW)).toEqual({
      currentUsd: 300,
      previousUsd: 200,
      pct: 0.5,
    });
  });

  it("declines to compute a ratio against a zero previous week", () => {
    const change = weekOverWeek([{ date: "2026-07-19", amount: 100 }], NOW);
    expect(change.pct).toBeNull();
  });
});

describe("digestTemplate — deterministic, injected numbers only", () => {
  it("carries every headline figure, formatted by money()/percent()", () => {
    const text = digestTemplate(facts());
    expect(text).toContain(money(8_500, "BRL"));
    expect(text).toContain(money(10_000, "BRL"));
    expect(text).toContain("85%");
    expect(text).toContain(money(12_000, "BRL"));
    expect(text).toContain("10%"); // week-over-week, neutral
    expect(text).toContain("Marketing");
  });

  it("shows collecting copy instead of a projection before day 5", () => {
    const text = digestTemplate(
      facts({ projection: null, projectedMargin: null }),
    );
    expect(text).toContain("coletando ritmo");
    expect(text).not.toContain(money(12_000, "BRL"));
  });
});

describe("narration guardrail (invariant #2)", () => {
  it("the prompt only asks to REPHRASE the already-computed draft", () => {
    const request = digestPrompt(facts());
    expect(request.prompt).toContain(digestTemplate(facts()));
    expect(request.system).toContain("não calcule");
  });

  it("accepts narration that reuses only injected figures", () => {
    const injected = injectedStrings(facts());
    const ok =
      "O gasto do período está em R$ 8.500,00 (85% do orçamento de R$ 10.000,00), " +
      "com fechamento projetado em R$ 12.000,00.";
    expect(narrationIsSafe(ok, injected)).toBe(true);
  });

  it("rejects any invented figure (acceptance criterion)", () => {
    const injected = injectedStrings(facts());
    expect(narrationIsSafe("O gasto chega a R$ 9.999,99.", injected)).toBe(false);
  });

  it("rejects re-rounded or truncated versions of injected figures", () => {
    const injected = injectedStrings(facts());
    // "R$ 12.000,00" restated as "R$ 12 mil" is a different digit sequence —
    // strict on purpose: honest numbers or no narration.
    expect(narrationIsSafe("A projeção é de R$ 12 mil, aproximadamente.", injected)).toBe(
      false,
    );
  });

  it("accepts number-free prose", () => {
    expect(narrationIsSafe("Tudo sob controle nesta semana.", [])).toBe(true);
  });
});

describe("anthropicNarrator", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("is unavailable (null) without an API key — callers use the template", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(anthropicNarrator()).toBeNull();
  });

  it("returns the text block on success (LLM mocked — no live call)", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFn = (async (url: unknown, init?: RequestInit) => {
      calls.push({ url: String(url), init: init! });
      return new Response(
        JSON.stringify({
          content: [{ type: "text", text: "Resumo narrado." }],
          stop_reason: "end_turn",
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const narrator = anthropicNarrator(fetchFn)!;
    const text = await narrator.narrate({ system: "s", prompt: "p" });
    expect(text).toBe("Resumo narrado.");

    expect(calls[0].url).toBe("https://api.anthropic.com/v1/messages");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.model).toBe("claude-haiku-4-5");
    expect(body.messages).toEqual([{ role: "user", content: "p" }]);
  });

  it("resolves to null on HTTP failure, refusal, or thrown fetch", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";

    const failing = anthropicNarrator(
      (async () => new Response("overloaded", { status: 529 })) as typeof fetch,
    )!;
    expect(await failing.narrate({ system: "s", prompt: "p" })).toBeNull();

    const refusing = anthropicNarrator(
      (async () =>
        new Response(JSON.stringify({ content: [], stop_reason: "refusal" }), {
          status: 200,
        })) as typeof fetch,
    )!;
    expect(await refusing.narrate({ system: "s", prompt: "p" })).toBeNull();

    const throwing = anthropicNarrator((async () => {
      throw new Error("network");
    }) as unknown as typeof fetch)!;
    expect(await throwing.narrate({ system: "s", prompt: "p" })).toBeNull();
  });
});
