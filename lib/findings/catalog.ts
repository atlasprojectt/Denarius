// Denarius — the control-plan catalog (pure data, no I/O). Invariant #2: the
// LLM PHRASES control actions, it never invents strategy. Every recommended
// action a finding carries is drawn from this curated, rule-mapped catalog.
//
// Product principle #2 (read-only governance): Denarius warns and recommends —
// it cannot block or cap. Every action here is ADVISORY, phrased as a
// recommendation to the human; any enforcement (a spend limit) happens in the
// provider's own console, by the CEO's decision, never by Denarius.

import type { ThresholdLevel } from "@/lib/engine/thresholds";

export type ControlAction = {
  id: string;
  /** Short imperative, pt-BR — the action the CEO can take. */
  title: string;
  /** One line of context on why it helps. */
  detail: string;
};

export const CONTROL_CATALOG = {
  reviewCostlyModels: {
    id: "review-costly-models",
    title: "Revisar os modelos mais caros do período",
    detail: "Os modelos de maior custo costumam concentrar o gasto — vale checar se o uso justifica o preço.",
  },
  shiftToSmaller: {
    id: "shift-to-smaller",
    title: "Migrar tarefas simples para modelos menores",
    detail: "Boa parte das chamadas simples roda bem em modelos mini/nano por uma fração do custo.",
  },
  talkToTopTeam: {
    id: "talk-to-top-team",
    title: "Conversar com o time de maior consumo",
    detail: "A concentração aponta onde uma conversa curta tem o maior efeito sobre o gasto.",
  },
  reviewIdleSeats: {
    id: "review-idle-seats",
    title: "Rever assentos ociosos frente ao roster",
    detail: "Assinaturas por assento acima do número de pessoas ativas viram custo fixo sem retorno.",
  },
  setProviderLimit: {
    id: "set-provider-limit",
    title: "Definir um limite de gasto no console do provedor",
    detail: "O limite é aplicado pelo próprio provedor — o Denarius apenas recomenda; a decisão é sua.",
  },
  revisitBudget: {
    id: "revisit-budget",
    title: "Reavaliar se o orçamento reflete o plano do período",
    detail: "Se o gasto acompanha um crescimento planejado, o orçamento pode estar defasado, não o gasto.",
  },
} as const satisfies Record<string, ControlAction>;

export type ControlActionKey = keyof typeof CONTROL_CATALOG;

// Rule-mapped: which curated actions accompany each severity level. Ordered by
// relevance (most actionable first) so a finding's control plan is prioritized.
const PLAN_BY_LEVEL: Record<ThresholdLevel, ControlActionKey[]> = {
  warning: ["reviewCostlyModels", "shiftToSmaller", "revisitBudget"],
  projected_breach: [
    "reviewCostlyModels",
    "shiftToSmaller",
    "talkToTopTeam",
    "setProviderLimit",
  ],
  breach: [
    "talkToTopTeam",
    "setProviderLimit",
    "reviewCostlyModels",
    "reviewIdleSeats",
  ],
};

/** The curated, ordered control plan for a threshold level. Never invented. */
export function controlPlanFor(level: ThresholdLevel): ControlAction[] {
  return PLAN_BY_LEVEL[level].map((key) => CONTROL_CATALOG[key]);
}
