// Denarius — weekly digest assembly (pure, no I/O). The hard guardrail of
// invariant #2 lives here: every figure is computed by the engine, formatted
// deterministically (money()/percent()), and INJECTED into both the template
// and the narration prompt. The LLM only rephrases; narrationIsSafe() rejects
// any output containing a number that was not injected, and the caller falls
// back to digestTemplate() — so a hallucinated figure can never reach email.

import type { Verdict } from "@/lib/engine/verdict";
import type { Driver } from "@/lib/engine/drivers";
import type { WeekChange } from "@/lib/engine/week-change";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";

const copy = {
  spentLine: (spent: string, budget: string, pct: string) =>
    `Gasto no período: ${spent} de ${budget} (${pct}).`,
  projectionLine: (projection: string, margin: string) =>
    `Projeção de fechamento: ${projection} — margem projetada de ${margin}.`,
  collectingLine:
    "Projeção de fechamento: coletando ritmo — disponível a partir do dia 5 do período.",
  weekLine: (pct: string) => `Gasto de API na semana: ${pct} vs a semana anterior.`,
  driversIntro: "Principais consumidores:",
  driverLine: (label: string, value: string, share: string) =>
    `${label} — ${value} (${share})`,
};

export type DigestFacts = {
  verdictSentence: string;
  monthLabel: string;
  currency: string;
  spent: number;
  budget: number;
  pctSpent: number;
  /** null while the day-5 projection guard holds. */
  projection: number | null;
  projectedMargin: number | null;
  /** Week-over-week API change; pct null when last week had no spend. */
  weekChangePct: number | null;
  drivers: Driver[];
};

export function buildDigestFacts(input: {
  verdict: Verdict;
  monthLabel: string;
  currency: string;
  spent: number;
  budget: number;
  pctSpent: number;
  projection: number | null;
  projectedMargin: number | null;
  weekChange: WeekChange;
  drivers: Driver[];
}): DigestFacts {
  return {
    verdictSentence: input.verdict.sentence,
    monthLabel: input.monthLabel,
    currency: input.currency,
    spent: input.spent,
    budget: input.budget,
    pctSpent: input.pctSpent,
    projection: input.projection,
    projectedMargin: input.projectedMargin,
    weekChangePct: input.weekChange.pct,
    drivers: input.drivers.slice(0, 3),
  };
}

/** Every formatted string whose digits the narration may legitimately use. */
export function injectedStrings(facts: DigestFacts): string[] {
  const strings = [
    facts.verdictSentence,
    facts.monthLabel,
    money(facts.spent, facts.currency),
    money(facts.budget, facts.currency),
    percent(facts.pctSpent),
  ];
  if (facts.projection !== null) strings.push(money(facts.projection, facts.currency));
  if (facts.projectedMargin !== null) {
    strings.push(money(facts.projectedMargin, facts.currency));
  }
  if (facts.weekChangePct !== null) strings.push(percent(facts.weekChangePct));
  for (const d of facts.drivers) {
    strings.push(money(d.value, facts.currency), percent(d.share));
  }
  // The projection-guard day appears in the collecting copy.
  strings.push("5");
  return strings;
}

/** The deterministic pt-BR digest — the fallback AND the narration's canvas. */
export function digestTemplate(facts: DigestFacts): string {
  const c = facts.currency;
  const lines = [
    facts.verdictSentence,
    "",
    copy.spentLine(money(facts.spent, c), money(facts.budget, c), percent(facts.pctSpent)),
    facts.projection !== null && facts.projectedMargin !== null
      ? copy.projectionLine(money(facts.projection, c), money(facts.projectedMargin, c))
      : copy.collectingLine,
  ];
  if (facts.weekChangePct !== null) {
    lines.push(copy.weekLine(percent(facts.weekChangePct)));
  }
  if (facts.drivers.length > 0) {
    lines.push(
      "",
      copy.driversIntro,
      ...facts.drivers.map((d) =>
        copy.driverLine(d.label, money(d.value, c), percent(d.share)),
      ),
    );
  }
  return lines.join("\n");
}

export type NarrationRequest = { system: string; prompt: string };

/** Prompt asking the LLM to REPHRASE the template — never to compute. */
export function digestPrompt(facts: DigestFacts): NarrationRequest {
  return {
    system:
      "Você escreve o resumo executivo semanal do Denarius, uma ferramenta de governança de gasto com IA. " +
      "Reescreva o rascunho abaixo como um resumo curto e claro em português do Brasil, em 2 a 4 parágrafos curtos, tom calmo e objetivo. " +
      "REGRAS INEGOCIÁVEIS: use SOMENTE os valores, porcentagens e datas exatamente como aparecem no rascunho — não calcule, não arredonde, não converta e não invente nenhum número. " +
      "Não recomende ações. Não use alarmismo. Responda apenas com o texto do resumo.",
    prompt: `Rascunho (${facts.monthLabel}):\n\n${digestTemplate(facts)}`,
  };
}

const NUMBER_TOKEN = /\d[\d.,]*\d|\d/g;

/** Digit sequences (separators stripped) present in a set of strings. */
function digitSequences(strings: string[]): Set<string> {
  const set = new Set<string>();
  for (const s of strings) {
    for (const token of s.match(NUMBER_TOKEN) ?? []) {
      set.add(token.replace(/[.,]/g, ""));
    }
  }
  return set;
}

/**
 * True when every number in `candidate` also appears among the injected
 * strings. Strict on purpose: a truncated or re-rounded figure ("R$ 1.234"
 * out of "R$ 1.234,56") is rejected too — honest numbers or no narration.
 */
export function narrationIsSafe(candidate: string, injected: string[]): boolean {
  const allowed = digitSequences(injected);
  for (const token of candidate.match(NUMBER_TOKEN) ?? []) {
    if (!allowed.has(token.replace(/[.,]/g, ""))) return false;
  }
  return true;
}
