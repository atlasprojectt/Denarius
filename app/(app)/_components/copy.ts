// Home cockpit copy (F2: pt-BR, isolated, never inline in JSX). Sentence case
// throughout; alarm language only where a warning warrants it, observation
// language elsewhere (product principle #6).

export const homeCopy = {
  question: "Você está no controle do gasto com IA?",
  verdictAction: "Ver time",
  dataAsOf: (stamp: string) => `Atualizado ${stamp}`,

  setup: {
    title: "Prepare o primeiro veredito",
    subtitle: "Três passos deixam o Denarius pronto para responder se o gasto está sob controle.",
    progress: (done: number, total: number) => `${done} de ${total} concluídos`,
    stepDone: (label: string) => `${label} — concluído`,
    connected: "Conectar um provedor",
    connectedDetail: "OpenAI ou Anthropic, com uma Admin Key somente leitura.",
    hasRoster: "Importar o roster",
    hasRosterDetail: "Times e pessoas para atribuir cada real gasto.",
    hasBudget: "Definir o orçamento",
    hasBudgetDetail: "O limite mensal que destrava veredito e avisos.",
    continue: "Continuar configuração",
  },

  hero: {
    title: "Gasto do mês",
    ofBudget: (budget: string) => `de ${budget}`,
    weekDelta: (pct: string) => `${pct} vs semana anterior`,
    kpiProjection: "Projeção de fechamento",
    collectingShort: "coletando ritmo",
    unconverted: (usd: string) =>
      `+ ${usd} de API ainda sem câmbio congelado — fora do total até o câmbio ser capturado.`,
    // Pacing bar. The meta row pairs the two figures the bar exists to
    // compare: how much of the budget is gone against how much of the month.
    periodDay: (day: number, days: number) => `dia ${day} de ${days}`,
    pace: {
      spent: "Gasto",
      projected: "Projeção",
      budget: "Orçamento",
      /** Always present for assistive tech — the visual legend is hover-only. */
      description: (spent: string, elapsed: string) =>
        `Barra de ritmo: ${spent} do orçamento gasto, com ${elapsed} do mês decorrido. A parte cheia é o gasto, a parte clara é a projeção de fechamento e a linha marca o orçamento.`,
    },
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
    info: "Gasto acumulado dia a dia, com projeção de fechamento e referência do orçamento mensal.",
    empty: "Sem gasto registrado neste período ainda.",
    aria: (realized: string, pace: string, projection: string) =>
      `Evolução do gasto do mês: ${realized} realizados até hoje, ritmo esperado de ${pace}, projeção de fechamento de ${projection}.`,
    ariaCollecting: (realized: string, pace: string) =>
      `Evolução do gasto do mês: ${realized} realizados até hoje, ritmo esperado de ${pace}. Projeção ainda coletando ritmo.`,
    // Header metrics row — labels secondary, values in the foreground.
    realizedLabel: "Realizado",
    paceTodayLabel: "Ritmo esperado hoje",
    projectionLabel: "Projeção",
    collectingShort: "coletando ritmo",
    // Series + tooltip labels.
    spent: "Gasto",
    projected: "Projeção",
    budget: "Orçamento",
    cumulative: "Acumulado",
    versusBudget: "Vs. orçamento",
    aboveBudget: (delta: string, pct: string) => `+${delta} · ${pct}`,
    belowBudget: (delta: string, pct: string) => `${delta} · ${pct}`,
    closingDate: "Fechamento",
    estimatedBreach: "Estouro estimado",
    dayLabel: (day: number, month: string) => `${day} de ${month}`,
    todayValue: (value: string) => `Hoje · ${value}`,
    projectionValue: (value: string) => `Projeção · ${value}`,
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
} as const;
