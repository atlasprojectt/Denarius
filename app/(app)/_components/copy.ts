// Home cockpit copy (F2: pt-BR, isolated, never inline in JSX). Sentence case
// throughout; alarm language only where a warning warrants it, observation
// language elsewhere (product principle #6).

export const homeCopy = {
  question: "Você está no controle do gasto com IA?",
  verdictAction: "Ver time",
  dataAsOf: (stamp: string) => `dados de ${stamp}`,

  setup: {
    title: "Prepare o primeiro veredito",
    subtitle: "Três passos deixam o Denarius pronto para responder se o gasto está sob controle.",
    step: (number: number) => `Passo ${number}`,
    connected: "Conectar um provedor",
    hasRoster: "Importar o roster",
    hasBudget: "Definir o orçamento",
    continue: "Continuar configuração",
  },

  hero: {
    title: "Gasto do mês",
    ofBudget: (budget: string) => `de ${budget}`,
    weekDelta: (pct: string) => `${pct} vs semana anterior`,
    kpiProjection: "Projeção de fechamento",
    collectingShort: "coletando ritmo",
    today: (day: number, days: number) => `hoje · dia ${day} de ${days}`,
    unconverted: (usd: string) =>
      `+ ${usd} de API ainda sem câmbio congelado — fora do total até o câmbio ser capturado.`,
  },

  composition: {
    title: "Gasto por fonte",
    info: "O mesmo gasto do período, agrupado por fonte — o total da empresa é a soma dos times mais o não atribuído. Tokens e modelos ficam em Explorar.",
    empty: "Sem gasto de API convertido ainda neste período.",
    entryValue: (amount: string, pct: string) => `${amount} (${pct})`,
    unattributed: (amount: string) => `${amount} sem atribuição`,
    unattributedNoFx: (seats: string, usd: string) =>
      `${seats} sem atribuição (+ ${usd} de API sem câmbio do período)`,
    mapCta: "Atribuir",
  },

  monthlyPace: {
    title: "Evolução do mês",
    info: "Gasto acumulado contra o tempo do período — a linha tracejada é a projeção linear.",
    empty: "Sem gasto registrado neste período ainda.",
    aria: "Gráfico de linha do gasto atual, orçamento e projeção do mês",
    spent: "Gasto",
    projected: "Projeção",
    budget: "Orçamento",
    start: "Início",
    today: "Hoje",
    close: "Fechamento",
    todayValue: (value: string) => `hoje · ${value}`,
    projectionOver: (delta: string) => `+${delta} vs orçamento`,
  },

  coldStart: {
    title: "Configure o Denarius para ter a resposta",
    body: "O veredito — dentro ou fora do orçamento, com projeção de fechamento — aparece assim que houver um orçamento definido e uma fonte de gasto.",
    setBudgetCta: "Definir orçamento",
    connectCta: "Conectar provedores",
    unlocks: [
      "Veredito diário: dentro ou fora do orçamento, em uma frase",
      "Projeção de fechamento do mês no ritmo atual",
      "Avisos antecipados antes de o orçamento estourar",
    ],
  },

  observations: {
    title: "Observações",
    subtitle: "Apontamentos do período — para pensar, não para alarmar.",
    seatsNote:
      "Comparação com o roster importado — a detecção real de assentos ociosos chega com o conector do Copilot (v1.5).",
  },
} as const;
